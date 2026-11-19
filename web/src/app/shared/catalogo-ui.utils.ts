export const POCAS_UNIDADES = 3;

export const TEXTO_JAPONES_CATEGORIA: Readonly<Record<string, string>> = {
    figuras: 'フィギュア',
    poleras: 'Tシャツ',
    peluches: 'ぬいぐるみ',
    pines: 'ピン',
    accesorios: 'アクセサリー',
    mochilas: 'リュック',
};

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

export function textoJaponesCategoria(nombre: string | null | undefined): string | null {
    if (!nombre) return null;
    const clave = nombre.trim().toLowerCase();
    return TEXTO_JAPONES_CATEGORIA[clave] ?? null;
}

export function claseBordeCategoria(nombre: string | null | undefined): string {
    const clave = (nombre ?? '').trim().toLowerCase();
    switch (clave) {
        case 'poleras':
        case 'pines':
            return 'border-rosa/35 hover:border-rosa/80 hover:shadow-[0_0_22px_rgba(255,79,163,0.28)]';
        case 'peluches':
        case 'accesorios':
            return 'border-cian/35 hover:border-cian/80 hover:shadow-[0_0_22px_rgba(47,217,255,0.26)]';
        case 'figuras':
        case 'mochilas':
        default:
            return 'border-violeta/40 hover:border-violeta/85 hover:shadow-[0_0_22px_rgba(124,92,255,0.32)]';
    }
}
