import { Injectable, signal } from '@angular/core';
import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import {
    DetalleCierreCaja,
    PedidoDetalle,
    ReporteInteligenciaStock,
    ReporteMargen,
    ReporteMasVendidos,
    ReporteVentasPorCanal,
    Venta,
} from '../core/modelos';
import { formatearFechaIsoADmy } from './csv.utils';

export interface VistaPreviaPdf {
    blobUrl: string;
    nombreArchivo: string;
    titulo: string;
    formatoDescripcion: string;
}

const COLOR_VINO: [number, number, number] = [86, 21, 48]; // #561530
const COLOR_NEGRO: [number, number, number] = [12, 16, 20]; // #0c1014
const COLOR_PERLA: [number, number, number] = [249, 235, 237]; // #f9ebed
const COLOR_GRIS: [number, number, number] = [100, 116, 139];

function bs(centavos: number): string {
    const negativo = centavos < 0;
    const abs = Math.abs(centavos) / 100;
    const texto = abs.toLocaleString('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${negativo ? '-' : ''}Bs. ${texto}`;
}

function fechaHora(valor: string | number | Date | null | undefined): string {
    if (!valor) return '—';
    const d = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(d.getTime())) return String(valor);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function hoyDmy(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

@Injectable({
    providedIn: 'root',
})
export class PdfService {
    private logoDataUrlCache: string | null | undefined = undefined;
    readonly vistaPrevia = signal<VistaPreviaPdf | null>(null);

    cerrarVistaPrevia(): void {
        const actual = this.vistaPrevia();
        if (actual) {
            URL.revokeObjectURL(actual.blobUrl);
            this.vistaPrevia.set(null);
        }
    }

    descargarVistaPrevia(): void {
        const actual = this.vistaPrevia();
        if (!actual) return;
        const a = document.createElement('a');
        a.href = actual.blobUrl;
        a.download = actual.nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    private abrirVistaPrevia(
        doc: jsPDF,
        nombreArchivo: string,
        titulo: string,
        formatoDescripcion: string,
    ): void {
        this.cerrarVistaPrevia();
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        this.vistaPrevia.set({
            blobUrl,
            nombreArchivo,
            titulo,
            formatoDescripcion,
        });
    }

    private async cargarDependencias(): Promise<{
        jsPDF: typeof jsPDF;
        autoTable: (doc: jsPDF, options: UserOptions) => void;
    }> {
        const [{ jsPDF: JsPDFCtor }, autoTableMod] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable'),
        ]);
        return {
            jsPDF: JsPDFCtor,
            autoTable: autoTableMod.default,
        };
    }

    private async obtenerLogoDataUrl(): Promise<string | null> {
        if (this.logoDataUrlCache !== undefined) {
            return this.logoDataUrlCache;
        }
        try {
            const resp = await fetch('img/logo-96.png');
            if (!resp.ok) {
                this.logoDataUrlCache = null;
                return null;
            }
            const blob = await resp.blob();
            const dataUrl = await new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () =>
                    resolve(typeof reader.result === 'string' ? reader.result : null);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
            this.logoDataUrlCache = dataUrl;
            return dataUrl;
        } catch {
            this.logoDataUrlCache = null;
            return null;
        }
    }

    private async dibujarMembrete(
        doc: jsPDF,
        titulo: string,
        subtitulo: string,
    ): Promise<number> {
        const ancho = doc.internal.pageSize.getWidth();
        const compacto = ancho < 160;
        const altoBarra = compacto ? 22 : 26;

        doc.setFillColor(...COLOR_VINO);
        doc.rect(0, 0, ancho, altoBarra, 'F');

        const logo = await this.obtenerLogoDataUrl();
        const margenX = compacto ? 10 : 14;
        let xTexto = margenX;
        if (logo) {
            const radio = compacto ? 6.5 : 8;
            doc.setFillColor(255, 255, 255);
            doc.circle(margenX + radio, altoBarra / 2, radio, 'F');
            const imgSize = compacto ? 11 : 14;
            doc.addImage(
                logo,
                'PNG',
                margenX + radio - imgSize / 2,
                altoBarra / 2 - imgSize / 2,
                imgSize,
                imgSize,
            );
            xTexto = margenX + radio * 2 + 4;
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(compacto ? 12 : 14);
        doc.text('ONII-CHAN STORE', xTexto, compacto ? 9.5 : 11.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(compacto ? 8.5 : 9.5);
        doc.text(titulo, xTexto, compacto ? 15.5 : 17.5);

        doc.setFontSize(compacto ? 7.5 : 8.5);
        doc.text(`Emitido: ${hoyDmy()}`, ancho - margenX, compacto ? 9.5 : 11.5, {
            align: 'right',
        });
        doc.text(subtitulo, ancho - margenX, compacto ? 15.5 : 17.5, { align: 'right' });

        doc.setTextColor(...COLOR_NEGRO);
        return altoBarra + 7;
    }

    private dibujarPiePaginas(doc: jsPDF, notaPie: string): void {
        const totalPaginas = doc.getNumberOfPages();
        const ancho = doc.internal.pageSize.getWidth();
        const alto = doc.internal.pageSize.getHeight();
        const margenX = ancho < 160 ? 10 : 14;

        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.line(margenX, alto - 13, ancho - margenX, alto - 13);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...COLOR_GRIS);
            doc.text(notaPie, margenX, alto - 8);
            if (totalPaginas > 1) {
                doc.text(`Página ${i} de ${totalPaginas}`, ancho - margenX, alto - 8, {
                    align: 'right',
                });
            }
        }
    }

    private ultimoY(doc: jsPDF, fallback: number): number {
        const docConTabla = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
        return docConTabla.lastAutoTable?.finalY ?? fallback;
    }

    private asegurarEspacio(doc: jsPDF, yActual: number, espacioNecesario: number): number {
        const alto = doc.internal.pageSize.getHeight();
        if (yActual + espacioNecesario > alto - 18) {
            doc.addPage();
            return 20;
        }
        return yActual;
    }

    /**
     * 1. Acta / Comprobante de Cierre de Caja (A4 con saltos inteligentes + vista previa)
     */
    async descargarCierreCaja(detalle: DetalleCierreCaja): Promise<void> {
        const { jsPDF: JsPDF, autoTable } = await this.cargarDependencias();
        const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const caja = detalle.caja;

        let y = await this.dibujarMembrete(
            doc,
            `Acta de Cierre de Caja #${caja.id}`,
            `Estado: ${caja.estado}`,
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text(`Apertura: ${fechaHora(caja.fechaApertura)}`, 14, y);
        doc.text(`Cierre: ${fechaHora(caja.fechaCierre)}`, 110, y);
        y += 6;

        const estadoArqueo =
            caja.diferenciaCentavos === null
                ? 'Caja abierta'
                : caja.diferenciaCentavos === 0
                  ? 'Exacto'
                  : caja.diferenciaCentavos > 0
                    ? `Sobrante (+${bs(caja.diferenciaCentavos)})`
                    : `Faltante (${bs(caja.diferenciaCentavos)})`;

        autoTable(doc, {
            startY: y,
            head: [['Concepto del arqueo', 'Monto']],
            body: [
                ['Monto inicial de caja', bs(caja.montoInicialCentavos)],
                ['(+) Ventas en efectivo (brutas)', bs(caja.ventasEfectivoCentavos)],
                ['(-) Devoluciones en efectivo', `-${bs(caja.devolucionesCentavos)}`],
                ['Efectivo esperado en caja', bs(caja.efectivoEsperadoCentavos)],
                [
                    'Efectivo contado al cierre',
                    caja.efectivoContadoCentavos !== null
                        ? bs(caja.efectivoContadoCentavos)
                        : 'Pendiente',
                ],
                ['Diferencia / Resultado', estadoArqueo],
                ['Cobros por QR (informativo, no entra a efectivo)', bs(caja.ventasQrCentavos)],
            ],
            theme: 'grid',
            headStyles: { fillColor: COLOR_VINO, textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 9, textColor: COLOR_NEGRO },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.index === 3) {
                    data.cell.styles.fillColor = COLOR_PERLA;
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            margin: { left: 14, right: 14 },
        });

        y = this.asegurarEspacio(doc, this.ultimoY(doc, y + 40) + 8, 28);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...COLOR_VINO);
        doc.text(`Ventas registradas en esta caja (${detalle.ventas.length})`, 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['#', 'Fecha', 'Canal', 'Pago', 'Productos', 'Total']],
            body:
                detalle.ventas.length > 0
                    ? detalle.ventas.map((v) => [
                          `#${v.id}`,
                          fechaHora(v.fecha),
                          v.canal === 'ONLINE' ? 'Online' : 'Mostrador',
                          v.metodoPago,
                          v.items.map((i) => `${i.cantidad}x ${i.nombreProducto}`).join(', '),
                          bs(v.totalCentavos),
                      ])
                    : [['—', 'Sin ventas registradas en esta caja', '', '', '', '']],
            theme: 'striped',
            headStyles: { fillColor: COLOR_NEGRO, textColor: 255, fontSize: 8.5 },
            bodyStyles: { fontSize: 8, textColor: COLOR_NEGRO },
            columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: 14, right: 14 },
        });

        y = this.asegurarEspacio(doc, this.ultimoY(doc, y + 20) + 8, 28);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...COLOR_VINO);
        doc.text(`Devoluciones registradas en esta caja (${detalle.devoluciones.length})`, 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['#', 'Fecha', 'Venta', 'Motivo', 'Monto']],
            body:
                detalle.devoluciones.length > 0
                    ? detalle.devoluciones.map((d) => [
                          `#${d.id}`,
                          fechaHora(d.fecha),
                          `Venta #${d.ventaId}`,
                          d.motivo,
                          `-${bs(d.montoCentavos)}`,
                      ])
                    : [['—', 'Sin devoluciones en esta caja', '', '', '']],
            theme: 'striped',
            headStyles: { fillColor: COLOR_NEGRO, textColor: 255, fontSize: 8.5 },
            bodyStyles: { fontSize: 8, textColor: COLOR_NEGRO },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: 14, right: 14 },
        });

        y = this.asegurarEspacio(doc, this.ultimoY(doc, y + 20) + 18, 18);
        doc.setDrawColor(148, 163, 184);
        doc.line(14, y, 86, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR_GRIS);
        doc.text('Firma Administradora / Propietaria', 14, y + 5);

        this.dibujarPiePaginas(doc, 'Onii-Chan Store — Acta de cierre de caja (control interno)');
        this.abrirVistaPrevia(
            doc,
            `onii-chan-cierre-caja-${caja.id}.pdf`,
            `Acta de Cierre de Caja #${caja.id}`,
            'A4 vertical',
        );
    }

    /**
     * 2. Recibo / Nota de Venta en formato Ticket Térmico 80 mm (altura adaptable al contenido)
     */
    async descargarNotaVenta(venta: Venta): Promise<void> {
        const { jsPDF: JsPDF } = await this.cargarDependencias();
        const ancho = 80;
        const margen = 5;
        const anchoUtil = ancho - margen * 2;

        // Calcular altura dinámica exacta según cantidad y largo de líneas de productos
        const docTemp = new JsPDF({ orientation: 'portrait', unit: 'mm', format: [ancho, 200] });
        docTemp.setFont('helvetica', 'normal');
        docTemp.setFontSize(8);
        let altoItems = 0;
        for (const item of venta.items) {
            const lineas = docTemp.splitTextToSize(item.nombreProducto, anchoUtil - 22) as string[];
            altoItems += Math.max(1, lineas.length) * 3.8 + 3.5;
        }
        const altoEstimado = Math.max(92, 58 + altoItems + (venta.cajaId ? 4 : 0) + 22);

        const doc = new JsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [ancho, altoEstimado],
        });

        const centro = ancho / 2;
        let y = 7;

        const logo = await this.obtenerLogoDataUrl();
        if (logo) {
            doc.addImage(logo, 'PNG', centro - 6, y, 12, 12);
            y += 15;
        }

        doc.setTextColor(...COLOR_NEGRO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('ONII-CHAN STORE', centro, y, { align: 'center' });
        y += 4.2;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLOR_GRIS);
        doc.text('COMPROBANTE DE VENTA', centro, y, { align: 'center' });
        y += 4;

        // Separador punteado
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(margen, y, ancho - margen, y);
        y += 4.5;

        // Metadatos
        doc.setTextColor(...COLOR_NEGRO);
        doc.setFontSize(7.8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Nota #${venta.id}`, margen, y);
        doc.setFont('helvetica', 'normal');
        doc.text(fechaHora(venta.fecha), ancho - margen, y, { align: 'right' });
        y += 4;

        doc.text(
            `Canal: ${venta.canal === 'ONLINE' ? 'Online' : 'Mostrador'}`,
            margen,
            y,
        );
        doc.text(`Pago: ${venta.metodoPago}`, ancho - margen, y, { align: 'right' });
        y += 4;

        if (venta.cajaId) {
            doc.text(`Caja: #${venta.cajaId}`, margen, y);
            y += 4;
        }

        doc.line(margen, y, ancho - margen, y);
        y += 4;

        // Encabezado de ítems
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('CANT / PRODUCTO', margen, y);
        doc.text('SUBTOTAL', ancho - margen, y, { align: 'right' });
        y += 3.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        for (const item of venta.items) {
            const titulo = `${item.cantidad}x ${item.nombreProducto}`;
            const lineas = doc.splitTextToSize(titulo, anchoUtil - 20) as string[];
            doc.text(lineas, margen, y);
            doc.setFont('helvetica', 'bold');
            doc.text(bs(item.precioCentavos * item.cantidad), ancho - margen, y, {
                align: 'right',
            });
            y += lineas.length * 3.6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(...COLOR_GRIS);
            doc.text(`  (${bs(item.precioCentavos)} c/u)`, margen, y);
            doc.setTextColor(...COLOR_NEGRO);
            doc.setFontSize(7.8);
            y += 3.6;
        }

        doc.line(margen, y, ancho - margen, y);
        y += 5;

        // Total destacado
        doc.setFillColor(...COLOR_PERLA);
        doc.rect(margen, y - 4, anchoUtil, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLOR_VINO);
        doc.text('TOTAL', margen + 2, y + 1.2);
        doc.text(bs(venta.totalCentavos), ancho - margen - 2, y + 1.2, { align: 'right' });
        y += 9;

        // Pie del ticket
        doc.setLineDashPattern([], 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLOR_GRIS);
        doc.text('Gracias por tu compra en Onii-Chan Store', centro, y, { align: 'center' });
        y += 3.6;
        doc.text('Control interno — No válido para crédito fiscal', centro, y, {
            align: 'center',
        });

        this.abrirVistaPrevia(
            doc,
            `onii-chan-ticket-venta-${venta.id}.pdf`,
            `Recibo de Venta #${venta.id}`,
            `Ticket térmico 80 mm × ${Math.round(altoEstimado)} mm`,
        );
    }

    /**
     * 3. Reporte Ejecutivo del Periodo (A4 con saltos inteligentes + vista previa)
     */
    async descargarReporteEjecutivo(params: {
        desde: string;
        hasta: string;
        ventasPorCanal: ReporteVentasPorCanal | null;
        masVendidos: ReporteMasVendidos | null;
        margen: ReporteMargen | null;
    }): Promise<void> {
        const { jsPDF: JsPDF, autoTable } = await this.cargarDependencias();
        const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const rangoTexto = `${formatearFechaIsoADmy(params.desde)} al ${formatearFechaIsoADmy(params.hasta)}`;

        let y = await this.dibujarMembrete(doc, 'Reporte Ejecutivo de Ventas y Márgenes', rangoTexto);

        if (params.ventasPorCanal) {
            const vc = params.ventasPorCanal;
            const mostrador = vc.canales.find((c) => c.canal === 'MOSTRADOR');
            const online = vc.canales.find((c) => c.canal === 'ONLINE');
            const efectivo = vc.metodosPago.find((m) => m.metodoPago === 'EFECTIVO');
            const qr = vc.metodosPago.find((m) => m.metodoPago === 'QR');
            const mg = params.margen?.totales;

            const filasResumen: string[][] = [
                ['Ventas brutas del periodo', bs(vc.totales.ventasBrutasCentavos)],
                ['(-) Devoluciones del periodo', `-${bs(vc.totales.devolucionesCentavos)}`],
                ['Ventas netas totales', bs(vc.totales.ventasNetasCentavos)],
                [
                    'Canal Mostrador (neto)',
                    `${bs(mostrador?.ventasNetasCentavos ?? 0)} (${mostrador?.cantidadVentas ?? 0} ventas)`,
                ],
                [
                    'Canal Online (neto)',
                    `${bs(online?.ventasNetasCentavos ?? 0)} (${online?.cantidadVentas ?? 0} ventas)`,
                ],
                ['Cobros brutos en Efectivo', bs(efectivo?.ventasBrutasCentavos ?? 0)],
                ['Cobros brutos por QR', bs(qr?.ventasBrutasCentavos ?? 0)],
            ];
            if (mg) {
                filasResumen.push(
                    ['Costo de mercadería vendida', bs(mg.costoNetoCentavos)],
                    [
                        `Ganancia neta (${mg.margenPorcentajePromedio}%)`,
                        bs(mg.margenTotalCentavos),
                    ],
                );
            }

            autoTable(doc, {
                startY: y,
                head: [['Indicador del periodo', 'Resultado']],
                body: filasResumen,
                theme: 'grid',
                headStyles: { fillColor: COLOR_VINO, textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 9, textColor: COLOR_NEGRO },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
                didParseCell: (data) => {
                    if (data.section === 'body' && (data.row.index === 2 || data.row.index === 8)) {
                        data.cell.styles.fillColor = COLOR_PERLA;
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                margin: { left: 14, right: 14 },
            });
            y = this.asegurarEspacio(doc, this.ultimoY(doc, y + 40) + 8, 30);
        }

        if (params.masVendidos && params.masVendidos.items.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...COLOR_VINO);
            doc.text('Productos más vendidos (neto)', 14, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Producto', 'Categoría', 'Unid. netas', 'Ingresos netos', 'Stock actual']],
                body: params.masVendidos.items.slice(0, 15).map((i) => [
                    i.nombre,
                    i.categoriaNombre,
                    String(i.unidadesNetas),
                    bs(i.ingresosNetosCentavos),
                    String(i.stockActual),
                ]),
                theme: 'striped',
                headStyles: { fillColor: COLOR_NEGRO, textColor: 255, fontSize: 8.5 },
                bodyStyles: { fontSize: 8, textColor: COLOR_NEGRO },
                columnStyles: {
                    2: { halign: 'center' },
                    3: { halign: 'right', fontStyle: 'bold' },
                    4: { halign: 'center' },
                },
                margin: { left: 14, right: 14 },
            });
            y = this.asegurarEspacio(doc, this.ultimoY(doc, y + 25) + 8, 30);
        }

        if (params.margen && params.margen.items.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...COLOR_VINO);
            doc.text('Detalle de margen por producto', 14, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Producto', 'Unid.', 'Ingresos', 'Costo', 'Ganancia', 'Margen']],
                body: params.margen.items.slice(0, 20).map((i) => [
                    i.nombre,
                    String(i.unidadesNetas),
                    bs(i.ingresosNetosCentavos),
                    bs(i.costoNetoCentavos),
                    bs(i.margenCentavos),
                    `${i.margenPorcentaje}%`,
                ]),
                theme: 'striped',
                headStyles: { fillColor: COLOR_NEGRO, textColor: 255, fontSize: 8.5 },
                bodyStyles: { fontSize: 8, textColor: COLOR_NEGRO },
                columnStyles: {
                    1: { halign: 'center' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' },
                    5: { halign: 'right' },
                },
                margin: { left: 14, right: 14 },
            });
        }

        this.dibujarPiePaginas(doc, `Onii-Chan Store — Reporte ejecutivo (${rangoTexto})`);
        this.abrirVistaPrevia(
            doc,
            `onii-chan-reporte-${params.desde}-a-${params.hasta}.pdf`,
            `Reporte Ejecutivo (${rangoTexto})`,
            'A4 vertical',
        );
    }

    /**
     * 4. Ficha de Pedido Online (A5 compacto con altura adaptable al contenido + vista previa)
     */
    async descargarFichaPedido(pedido: PedidoDetalle): Promise<void> {
        const { jsPDF: JsPDF, autoTable } = await this.cargarDependencias();
        const ancho = 148; // A5 ancho
        const altoDinamico = Math.max(125, Math.min(297, 82 + pedido.items.length * 11));
        const doc = new JsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [ancho, altoDinamico],
        });

        let y = await this.dibujarMembrete(
            doc,
            `Ficha de Pedido ${pedido.codigo}`,
            `Estado: ${pedido.estado}`,
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        doc.text(`Cliente: ${pedido.nombreCliente || 'Sin nombre'}`, 10, y);
        doc.text(`Tel: ${pedido.telefonoCliente || 'No registrado'}`, ancho - 10, y, {
            align: 'right',
        });
        y += 5;
        doc.text(`Fecha: ${fechaHora(pedido.fechaCreacion)}`, 10, y);
        if (pedido.fechaConfirmacion) {
            doc.text(`Confirmado: ${fechaHora(pedido.fechaConfirmacion)}`, ancho - 10, y, {
                align: 'right',
            });
        }
        y += 6;

        autoTable(doc, {
            startY: y,
            head: [['Producto', 'Cant.', 'Nota / Talla', 'P. Unit.', 'Subtotal']],
            body: pedido.items.map((item) => [
                item.nombreProducto,
                String(item.cantidad),
                item.notaCliente || '—',
                bs(item.precioCentavos),
                bs(item.precioCentavos * item.cantidad),
            ]),
            foot: [['', '', '', 'TOTAL', bs(pedido.totalCentavos)]],
            theme: 'grid',
            headStyles: { fillColor: COLOR_VINO, textColor: 255, fontSize: 8 },
            footStyles: {
                fillColor: COLOR_PERLA,
                textColor: COLOR_NEGRO,
                fontStyle: 'bold',
                fontSize: 9,
            },
            bodyStyles: { fontSize: 8, textColor: COLOR_NEGRO },
            columnStyles: {
                1: { halign: 'center' },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 10, right: 10 },
        });

        y = this.ultimoY(doc, y + 30) + 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLOR_GRIS);
        doc.text('Verificación de armado y tallas antes de entrega:   [   ] Revisado', 10, y);

        this.dibujarPiePaginas(doc, `Onii-Chan Store — Pedido ${pedido.codigo}`);
        this.abrirVistaPrevia(
            doc,
            `onii-chan-pedido-${pedido.codigo}.pdf`,
            `Ficha de Pedido ${pedido.codigo}`,
            `A5 compacto (148 mm × ${Math.round(altoDinamico)} mm)`,
        );
    }

    /**
     * 5. Lista de Reposición e Inventario Inmovilizado (A4 + vista previa)
     */
    async descargarReposicionInventario(inteligencia: ReporteInteligenciaStock): Promise<void> {
        const { jsPDF: JsPDF, autoTable } = await this.cargarDependencias();
        const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        let y = await this.dibujarMembrete(
            doc,
            'Lista de Reposición y Salud de Stock',
            'Ventana: últimos 30 días',
        );

        autoTable(doc, {
            startY: y,
            head: [['Indicador de inventario', 'Valor']],
            body: [
                [
                    'Productos para reponer pronto (14 días o menos)',
                    String(inteligencia.resumen.productosParaReponer),
                ],
                [
                    'Productos sin ventas en los últimos 30 días',
                    String(inteligencia.resumen.totalSinRotacion),
                ],
                [
                    'Capital inmovilizado (productos sin ventas 30d)',
                    bs(inteligencia.resumen.valorInmovilizadoCentavos),
                ],
            ],
            theme: 'grid',
            headStyles: { fillColor: COLOR_VINO, textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 9, textColor: COLOR_NEGRO },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: 14, right: 14 },
        });

        y = this.asegurarEspacio(doc, this.ultimoY(doc, y + 30) + 8, 28);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...COLOR_VINO);
        doc.text('Cobertura y sugerencia de reposición', 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Producto', 'Categoría', 'Stock', 'Vend. 30d', 'Cobertura', 'Sugerido reponer']],
            body:
                inteligencia.cobertura.length > 0
                    ? inteligencia.cobertura.map((c) => [
                          c.nombre,
                          c.categoriaNombre,
                          String(c.stockActual),
                          String(c.unidadesNetas30d),
                          `${c.diasCobertura} días`,
                          c.sugerenciaReposicion > 0 ? `+${c.sugerenciaReposicion} unid.` : 'Suficiente',
                      ])
                    : [['—', 'Sin ventas registradas en los últimos 30 días', '', '', '', '']],
            theme: 'striped',
            headStyles: { fillColor: COLOR_NEGRO, textColor: 255, fontSize: 8.5 },
            bodyStyles: { fontSize: 8, textColor: COLOR_NEGRO },
            columnStyles: {
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 14, right: 14 },
        });

        if (inteligencia.sinRotacion30d.length > 0) {
            y = this.asegurarEspacio(doc, this.ultimoY(doc, y + 25) + 8, 28);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...COLOR_VINO);
            doc.text('Productos sin movimiento en 30 días (capital inmovilizado)', 14, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Producto', 'Categoría', 'Stock', 'Costo unit.', 'Capital inmovilizado']],
                body: inteligencia.sinRotacion30d.map((s) => [
                    s.nombre,
                    s.categoriaNombre,
                    String(s.stockActual),
                    bs(s.costoCentavos),
                    bs(s.valorInmovilizadoCentavos),
                ]),
                theme: 'striped',
                headStyles: { fillColor: COLOR_NEGRO, textColor: 255, fontSize: 8.5 },
                bodyStyles: { fontSize: 8, textColor: COLOR_NEGRO },
                columnStyles: {
                    2: { halign: 'center' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' },
                },
                margin: { left: 14, right: 14 },
            });
        }

        this.dibujarPiePaginas(doc, 'Onii-Chan Store — Lista de reposición e inventario');
        this.abrirVistaPrevia(
            doc,
            'onii-chan-reposicion-stock.pdf',
            'Lista de Reposición y Salud de Stock',
            'A4 vertical',
        );
    }
}
