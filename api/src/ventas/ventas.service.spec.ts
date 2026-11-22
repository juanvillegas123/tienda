import { BadRequestException, ConflictException } from '@nestjs/common';
import { db } from '../db/db';
import { VentasService } from './ventas.service';

function crearCadenaSelect(resultado: unknown) {
    const promesa = Promise.resolve(resultado);
    const cadena = Object.assign(promesa, {
        from: jest.fn(),
        where: jest.fn(),
        orderBy: jest.fn(),
        limit: jest.fn().mockReturnValue(promesa),
    });
    cadena.from.mockReturnValue(cadena);
    cadena.where.mockReturnValue(cadena);
    cadena.orderBy.mockReturnValue(cadena);
    return cadena;
}

describe('VentasService.crear (RN-01, RN-06, RN-09)', () => {
    let service: VentasService;
    let txSpy: jest.SpyInstance;

    beforeEach(() => {
        service = new VentasService();
    });

    afterEach(() => {
        txSpy?.mockRestore();
    });

    it('rechaza con 400 si no existe una caja abierta (RN-06)', async () => {
        const tx = {
            select: jest.fn().mockReturnValue(crearCadenaSelect([])),
        };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        await expect(
            service.crear(
                { metodoPago: 'EFECTIVO', items: [{ productoId: 1, cantidad: 1 }] },
                1,
            ),
        ).rejects.toThrow(BadRequestException);
    });

    it('rechaza con 409 cuando el stock registrado es insuficiente (RN-01)', async () => {
        const selectMock = jest
            .fn()
            .mockReturnValueOnce(crearCadenaSelect([{ id: 4 }])) // caja abierta
            .mockReturnValueOnce(
                crearCadenaSelect([
                    {
                        id: 1,
                        nombre: 'Polera Akatsuki',
                        precioCentavos: 15000,
                        costoCentavos: 9000,
                        stock: 1,
                        activo: true,
                    },
                ]),
            );

        const tx = { select: selectMock };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        await expect(
            service.crear(
                { metodoPago: 'EFECTIVO', items: [{ productoId: 1, cantidad: 2 }] },
                1,
            ),
        ).rejects.toThrow(ConflictException);
    });

    it('rechaza con 409 si el UPDATE condicionado de stock afecta 0 filas por concurrencia', async () => {
        const selectMock = jest
            .fn()
            .mockReturnValueOnce(crearCadenaSelect([{ id: 4 }]))
            .mockReturnValueOnce(
                crearCadenaSelect([
                    {
                        id: 1,
                        nombre: 'Figura Gojo',
                        precioCentavos: 26000,
                        costoCentavos: 14000,
                        stock: 2,
                        activo: true,
                    },
                ]),
            );

        const insertMock = jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 88 }]),
            }),
        });

        const updateMock = jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([]), // concurrencia: 0 filas
                }),
            }),
        });

        const tx = { select: selectMock, insert: insertMock, update: updateMock };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        await expect(
            service.crear(
                { metodoPago: 'QR', items: [{ productoId: 1, cantidad: 2 }] },
                1,
            ),
        ).rejects.toThrow(ConflictException);
    });

    it('consolida productos repetidos, calcula total en servidor (RN-09) y registra venta + salida', async () => {
        const insertados: unknown[] = [];
        const selectMock = jest
            .fn()
            .mockReturnValueOnce(crearCadenaSelect([{ id: 4 }]))
            .mockReturnValueOnce(
                crearCadenaSelect([
                    {
                        id: 1,
                        nombre: 'Pin One Piece',
                        precioCentavos: 2500,
                        costoCentavos: 1000,
                        stock: 10,
                        activo: true,
                    },
                ]),
            );

        const insertMock = jest.fn().mockImplementation(() => ({
            values: jest.fn().mockImplementation((vals: unknown) => {
                insertados.push(vals);
                return {
                    returning: jest.fn().mockResolvedValue([{ id: 91 }]),
                };
            }),
        }));

        const updateMock = jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
                }),
            }),
        });

        const tx = { select: selectMock, insert: insertMock, update: updateMock };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        const cargarSpy = jest
            .spyOn(service as any, 'cargarVentasConDetalles')
            .mockResolvedValue([
                {
                    id: 91,
                    cajaId: 4,
                    pedidoId: null,
                    administradoraId: 1,
                    canal: 'MOSTRADOR',
                    metodoPago: 'EFECTIVO',
                    totalCentavos: 7500,
                    fecha: new Date(),
                    items: [],
                    devoluciones: [],
                },
            ]);

        const venta = await service.crear(
            {
                metodoPago: 'EFECTIVO',
                items: [
                    { productoId: 1, cantidad: 1 },
                    { productoId: 1, cantidad: 2 },
                ],
            },
            1,
        );

        expect(venta.id).toBe(91);
        expect(insertados).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    cajaId: 4,
                    canal: 'MOSTRADOR',
                    totalCentavos: 7500,
                }),
                expect.objectContaining({
                    ventaId: 91,
                    productoId: 1,
                    cantidad: 3,
                    precioCentavos: 2500,
                    costoCentavos: 1000,
                }),
                expect.objectContaining({
                    productoId: 1,
                    tipo: 'SALIDA',
                    cantidad: 3,
                    tipoReferencia: 'VENTA_MOSTRADOR',
                    idReferencia: 91,
                }),
            ]),
        );

        cargarSpy.mockRestore();
    });
});
