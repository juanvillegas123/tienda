import {
    bsACentavos,
    centavosABs,
    sumarCentavos,
    restarCentavos,
    multiplicarCentavos,
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
});
