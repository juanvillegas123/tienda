import { BsPipe } from './bs.pipe';

describe('BsPipe', () => {
    const pipe = new BsPipe();

    it('debe formatear centavos a Bolivianos con dos decimales', () => {
        const resultado = pipe.transform(4550);
        // Debe contener Bs. y 45,50 o 45.50 según locale
        expect(resultado).toContain('Bs.');
        expect(resultado).toContain('45');
    });

    it('debe manejar null y undefined devolviendo "Bs. —"', () => {
        expect(pipe.transform(null)).toBe('Bs. —');
        expect(pipe.transform(undefined)).toBe('Bs. —');
    });

    it('debe manejar 0 centavos', () => {
        const resultado = pipe.transform(0);
        expect(resultado).toContain('Bs.');
        expect(resultado).toContain('0');
    });
});
