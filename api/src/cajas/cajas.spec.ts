import { abrirCajaSchema, cerrarCajaSchema } from './cajas.schemas';
import { calcularCierreCaja } from './cajas.utils';

describe('Cajas (esquemas Zod y cálculo RN-10)', () => {
    it('valida apertura y cierre con centavos enteros >= 0', () => {
        expect(abrirCajaSchema.safeParse({ montoInicialCentavos: 20000 }).success).toBe(true);
        expect(abrirCajaSchema.safeParse({ montoInicialCentavos: -100 }).success).toBe(false);
        expect(abrirCajaSchema.safeParse({ montoInicialCentavos: 10.5 }).success).toBe(false);
        expect(cerrarCajaSchema.safeParse({ efectivoContadoCentavos: 0 }).success).toBe(true);
        expect(cerrarCajaSchema.safeParse({ efectivoContadoCentavos: -1 }).success).toBe(false);
    });

    it('calcula efectivo esperado y diferencia exacta (cuadra en 0)', () => {
        // Inicial Bs. 200 + Ventas efectivo Bs. 350 - Devoluciones Bs. 50 = Bs. 500
        const res = calcularCierreCaja(20000, 35000, 5000, 50000);
        expect(res.efectivoEsperadoCentavos).toBe(50000);
        expect(res.diferenciaCentavos).toBe(0);
    });

    it('registra faltante negativo y sobrante positivo sin corregirlos', () => {
        const faltante = calcularCierreCaja(10000, 25000, 0, 34000);
        expect(faltante.efectivoEsperadoCentavos).toBe(35000);
        expect(faltante.diferenciaCentavos).toBe(-1000);

        const sobrante = calcularCierreCaja(10000, 25000, 5000, 31500);
        expect(sobrante.efectivoEsperadoCentavos).toBe(30000);
        expect(sobrante.diferenciaCentavos).toBe(1500);
    });
});
