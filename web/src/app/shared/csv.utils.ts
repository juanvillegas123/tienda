/**
 * Descarga un archivo CSV con BOM UTF-8 (\uFEFF) para que Excel en español
 * abra correctamente tildes, ñ y montos sin corromper caracteres.
 */
export function descargarCsv(
    nombreArchivo: string,
    encabezados: string[],
    filas: (string | number | null | undefined)[][],
): void {
    const escapar = (valor: string | number | null | undefined): string => {
        if (valor === null || valor === undefined) return '';
        const str = String(valor);
        if (/[",\n\r;]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const lineas = [
        encabezados.map(escapar).join(','),
        ...filas.map((fila) => fila.map(escapar).join(',')),
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
 * Convierte centavos a número decimal con 2 decimales para celdas CSV (ej. "45.50").
 */
export function centavosADecimalCsv(centavos: number): string {
    return (centavos / 100).toFixed(2);
}
