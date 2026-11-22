import { ConflictException, NotFoundException } from '@nestjs/common';
import { db } from '../db/db';
import { PedidosService } from './pedidos.service';

function crearCadenaSelect(resultado: unknown) {
    const promesa = Promise.resolve(resultado);
    const cadena = Object.assign(promesa, {
        from: jest.fn(),
        where: jest.fn(),
        limit: jest.fn().mockReturnValue(promesa),
    });
    cadena.from.mockReturnValue(cadena);
    cadena.where.mockReturnValue(cadena);
    return cadena;
}

describe('PedidosService.confirmar (RN-01, RN-03, RN-09)', () => {
    let service: PedidosService;
    let txSpy: jest.SpyInstance;

    beforeEach(() => {
        service = new PedidosService();
    });

    afterEach(() => {
        txSpy?.mockRestore();
    });

    it('rechaza con 404 si el pedido no existe', async () => {
        const tx = {
            select: jest.fn().mockReturnValue(crearCadenaSelect([])),
        };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        await expect(service.confirmar(999, { metodoPago: 'EFECTIVO' }, 1)).rejects.toThrow(
            NotFoundException,
        );
    });

    it('rechaza con 409 si el pedido ya fue CONFIRMADO o CANCELADO', async () => {
        const tx = {
            select: jest
                .fn()
                .mockReturnValue(crearCadenaSelect([{ id: 10, codigo: 'PED-0010', estado: 'CONFIRMADO' }])),
        };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        await expect(service.confirmar(10, { metodoPago: 'QR' }, 1)).rejects.toThrow(
            ConflictException,
        );
    });

    it('rechaza con 409 y no crea venta si el descuento condicionado de stock falla (stock insuficiente)', async () => {
        const insertMock = jest.fn();
        const selectMock = jest
            .fn()
            // 1. pedido PENDIENTE
            .mockReturnValueOnce(
                crearCadenaSelect([{ id: 5, codigo: 'PED-0005', estado: 'PENDIENTE' }]),
            )
            // 2. detalles actuales
            .mockReturnValueOnce(
                crearCadenaSelect([
                    { id: 1, pedidoId: 5, productoId: 20, cantidad: 3, precioCentavos: 12000 },
                ]),
            )
            // 3. productos actuales
            .mockReturnValueOnce(
                crearCadenaSelect([
                    { id: 20, nombre: 'Figura Naruto', costoCentavos: 7000, stock: 1, activo: true },
                ]),
            );

        const updateMock = jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([]), // 0 filas afectadas => stock insuficiente
                }),
            }),
        });

        const tx = { select: selectMock, update: updateMock, insert: insertMock };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        await expect(service.confirmar(5, { metodoPago: 'EFECTIVO' }, 1)).rejects.toThrow(
            ConflictException,
        );
        expect(insertMock).not.toHaveBeenCalled();
    });

    it('confirma pedido PENDIENTE, ajusta cantidad, descuenta stock, crea venta ONLINE y registra movimiento', async () => {
        const insertados: unknown[] = [];
        const insertMock = jest.fn().mockImplementation(() => ({
            values: jest.fn().mockImplementation((vals: unknown) => {
                insertados.push(vals);
                return {
                    returning: jest.fn().mockResolvedValue([{ id: 77 }]),
                };
            }),
        }));

        const selectMock = jest
            .fn()
            // 1. pedido
            .mockReturnValueOnce(
                crearCadenaSelect([{ id: 5, codigo: 'PED-0005', estado: 'PENDIENTE' }]),
            )
            // 2. detalle_pedido
            .mockReturnValueOnce(
                crearCadenaSelect([
                    { id: 1, pedidoId: 5, productoId: 20, cantidad: 3, precioCentavos: 12000 },
                ]),
            )
            // 3. productos actuales
            .mockReturnValueOnce(
                crearCadenaSelect([
                    { id: 20, nombre: 'Figura Naruto', costoCentavos: 7000, stock: 5, activo: true },
                ]),
            )
            // 4. caja abierta
            .mockReturnValueOnce(crearCadenaSelect([{ id: 3 }]));

        const updateMock = jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([{ id: 20 }]),
                }),
            }),
        });

        const tx = { select: selectMock, update: updateMock, insert: insertMock };
        txSpy = jest.spyOn(db, 'transaction').mockImplementation((fn: any) => fn(tx));

        const obtenerSpy = jest.spyOn(service, 'obtenerPorId').mockResolvedValue({
            id: 5,
            codigo: 'PED-0005',
            nombreCliente: 'Ana',
            telefonoCliente: null,
            totalCentavos: 24000,
            estado: 'CONFIRMADO',
            fechaCreacion: new Date(),
            fechaConfirmacion: new Date(),
            vencido: false,
            cantidadItems: 2,
            items: [],
        });

        const res = await service.confirmar(
            5,
            {
                metodoPago: 'QR',
                itemsAjustados: [{ productoId: 20, cantidad: 2 }],
            },
            1,
        );

        expect(res.ventaId).toBe(77);
        // Se insertó venta ONLINE con total recalculado (2 * 12000 = 24000), detalle_venta con costo vigente y movimiento SALIDA
        expect(insertados).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    cajaId: 3,
                    pedidoId: 5,
                    canal: 'ONLINE',
                    metodoPago: 'QR',
                    totalCentavos: 24000,
                }),
                expect.objectContaining({
                    ventaId: 77,
                    productoId: 20,
                    cantidad: 2,
                    precioCentavos: 12000,
                    costoCentavos: 7000,
                }),
                expect.objectContaining({
                    productoId: 20,
                    tipo: 'SALIDA',
                    cantidad: 2,
                    tipoReferencia: 'VENTA',
                    idReferencia: 77,
                }),
            ]),
        );

        obtenerSpy.mockRestore();
    });
});
