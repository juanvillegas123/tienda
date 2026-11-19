export const POCAS_UNIDADES = 3;

export function esNotaTallaVisible(nota: string | null | undefined): boolean {
    if (!nota) return false;
    const limpia = nota.trim();
    return limpia.length > 0 && limpia.toLowerCase() !== 'n/a';
}

export function esEscalaVisible(escala: string | null | undefined): boolean {
    if (!escala) return false;
    const limpia = escala.trim();
    return limpia.length > 0 && limpia.toLowerCase() !== 'n/a';
}

export function etiquetaEscala(
    escala: string | null | undefined,
): { prefijo: 'Tamaño' | 'Escala'; valor: string } | null {
    if (!esEscalaVisible(escala)) return null;
    const valor = escala!.trim();
    if (/cm/i.test(valor)) {
        return { prefijo: 'Tamaño', valor };
    }
    return { prefijo: 'Escala', valor };
}
