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

export function slugify(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '');
}

export function rutaProducto(id: number, nombre: string): string {
    const slug = slugify(nombre);
    return slug.length > 0 ? `${slug}-${id}` : `${id}`;
}

export function extraerIdDeRuta(ruta: string | null): number | null {
    if (!ruta) return null;
    const limpia = ruta.trim();
    const matchSoloNumero = /^(\d+)$/.exec(limpia);
    const matchConSlug = /-(\d+)$/.exec(limpia);
    const captura = matchSoloNumero?.[1] ?? matchConSlug?.[1];
    if (!captura) return null;

    const id = Number(captura);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return id;
}
