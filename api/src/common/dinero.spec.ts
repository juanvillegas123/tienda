import {
    bsACentavos,
    centavosABs,
    sumarCentavos,
    restarCentavos,
    multiplicarCentavos,
    calcularPrecioConDescuento,
} from './dinero';

describe('Utilidades de Dinero (RN-04)', () => {
    it('debe convertir bolivianos a centavos redondeando exactamente', () => {
        expect(bsACentavos(45.5)).toBe(4550);
        expect(bsACentavos(10)).toBe(1000);
        expect(bsACentavos(0.99)).toBe(99);
    });

    it('debe convertir centavos a bolivianos', () => {
        expect(centavosABs(4550)).toBe(45.5);
        expect(centavosABs(1000)).toBe(10);
        expect(centavosABs(99)).toBe(0.99);
    });

    it('debe sumar montos en centavos como enteros', () => {
        expect(sumarCentavos(1050, 2025, 500)).toBe(3575);
    });

    it('debe restar centavos', () => {
        expect(restarCentavos(5000, 1550)).toBe(3450);
    });

    it('debe multiplicar centavos por cantidad entera', () => {
        expect(multiplicarCentavos(2550, 3)).toBe(7650);
    });

    it('debe calcular descuentos en centavos enteros sin decimales', () => {
        expect(calcularPrecioConDescuento(20000, 15)).toEqual({
            precioFinalCentavos: 17000,
            descuentoCentavos: 3000,
        });
        expect(calcularPrecioConDescuento(12500, 0)).toEqual({
            precioFinalCentavos: 12500,
            descuentoCentavos: 0,
        });
        expect(calcularPrecioConDescuento(9999, 10)).toEqual({
            precioFinalCentavos: 8999,
            descuentoCentavos: 1000,
        });
    });
});
