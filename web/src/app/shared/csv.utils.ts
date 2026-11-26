/**
 * Descarga un archivo CSV optimizado para Excel en español (Bolivia / LatAm):
 * - BOM UTF-8 (\uFEFF) para preservar tildes y ñ.
 * - Separador de columnas punto y coma (;) para que Excel divida cada columna automáticamente.
 * - Decimales con coma (,) para que los montos sean reconocidos como números sumables.
 */
export function descargarCsv(
    nombreArchivo: string,
    encabezados: string[],
    filas: (string | number | null | undefined)[][],
): void {
    const separador = ';';
    const escapar = (valor: string | number | null | undefined): string => {
        if (valor === null || valor === undefined) return '';
        let str = String(valor);
        // Mitiga CSV Formula Injection en Excel (=, +, @, tab, CR o '-' que no sea número negativo)
        if (typeof valor === 'string' && (/^[=+@\t\r]/.test(str) || /^-[^\d]/.test(str))) {
            str = `'${str}`;
        }
        if (/[";\n\r]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const lineas = [
        encabezados.map(escapar).join(separador),
        ...filas.map((fila) => fila.map(escapar).join(separador)),
    ];

    const contenido = `\uFEFF${lineas.join('\r\n')}`;
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`;
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
}

/**
 * Convierte "YYYY-MM-DD" a "dd/MM/yyyy" para mantener un formato único en todo el sistema.
 */
export function formatearFechaIsoADmy(iso: string | null | undefined): string {
    if (!iso) return '—';
    const partes = iso.split('-');
    if (partes.length !== 3) return iso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Convierte una fecha/hora a "dd/MM/yyyy HH:mm" limpia para celdas CSV.
 */
export function formatearFechaHoraCsv(valor: string | number | Date | null | undefined): string {
    if (!valor) return '';
    const d = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(d.getTime())) return String(valor);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/**
 * Convierte centavos a número decimal en formato español con coma (ej. "45,50")
 * para que Excel en español lo reconozca como monto numérico sumable.
 */
export function centavosADecimalCsv(centavos: number): string {
    return (centavos / 100).toFixed(2).replace('.', ',');
}
