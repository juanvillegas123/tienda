import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/db';
import { configuracion } from '../db/schema';
import type { ActualizarInfoTiendaDto } from './configuracion.schemas';

const CLAVE_WHATSAPP = 'whatsapp_numero';

export interface InfoTiendaDto extends ActualizarInfoTiendaDto {
    whatsappNumero: string | null;
}

const INFO_TIENDA_DEFAULT: ActualizarInfoTiendaDto = {
    descripcion:
        'Tienda especializada en figuras de colección, poleras, peluches, pines y accesorios anime seleccionados para tu vitrina.',
    direccion: 'Calle Loa #406',
    referencia: 'Zona céntrica — Sucre',
    ciudad: 'Sucre, Bolivia',
    horarios: 'Lunes a Sábado de 12:30 a 20:00',
    googleMapsUrl: 'https://maps.app.goo.gl/vD5J2k5nz5jXTPVb6',
    googleMapsEmbedUrl: '',
    instagramUrl: 'https://www.instagram.com/onii.chan_store.bo',
    instagramUsuario: '@onii.chan_store.bo',
    tiktokUrl: 'https://www.tiktok.com/@onii.chan.store',
    tiktokUsuario: '@onii.chan.store',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61553764629367',
    facebookUsuario: 'Onii-Chan Store',
};

const CLAVES_TIENDA: { clave: string; campo: keyof ActualizarInfoTiendaDto }[] = [
    { clave: 'tienda_descripcion', campo: 'descripcion' },
    { clave: 'tienda_direccion', campo: 'direccion' },
    { clave: 'tienda_referencia', campo: 'referencia' },
    { clave: 'tienda_ciudad', campo: 'ciudad' },
    { clave: 'tienda_horarios', campo: 'horarios' },
    { clave: 'tienda_google_maps_url', campo: 'googleMapsUrl' },
    { clave: 'tienda_google_maps_embed_url', campo: 'googleMapsEmbedUrl' },
    { clave: 'tienda_instagram_url', campo: 'instagramUrl' },
    { clave: 'tienda_instagram_usuario', campo: 'instagramUsuario' },
    { clave: 'tienda_tiktok_url', campo: 'tiktokUrl' },
    { clave: 'tienda_tiktok_usuario', campo: 'tiktokUsuario' },
    { clave: 'tienda_facebook_url', campo: 'facebookUrl' },
    { clave: 'tienda_facebook_usuario', campo: 'facebookUsuario' },
];

@Injectable()
export class ConfiguracionService {
    async obtenerWhatsapp(): Promise<{ whatsappNumero: string | null }> {
        try {
            const [fila] = await db
                .select({ valor: configuracion.valor })
                .from(configuracion)
                .where(eq(configuracion.clave, CLAVE_WHATSAPP))
                .limit(1);

            return { whatsappNumero: fila?.valor ?? null };
        } catch {
            return { whatsappNumero: null };
        }
    }

    async actualizarWhatsapp(whatsappNumero: string): Promise<{ whatsappNumero: string }> {
        await db
            .insert(configuracion)
            .values({ clave: CLAVE_WHATSAPP, valor: whatsappNumero })
            .onConflictDoUpdate({
                target: configuracion.clave,
                set: { valor: whatsappNumero },
            });

        return { whatsappNumero };
    }

    async obtenerInfoTienda(): Promise<InfoTiendaDto> {
        const resultado: InfoTiendaDto = {
            ...INFO_TIENDA_DEFAULT,
            whatsappNumero: null,
        };

        try {
            const todasClaves = [CLAVE_WHATSAPP, ...CLAVES_TIENDA.map((c) => c.clave)];
            const filas = await db
                .select({ clave: configuracion.clave, valor: configuracion.valor })
                .from(configuracion)
                .where(inArray(configuracion.clave, todasClaves));

            const mapa = new Map(filas.map((f) => [f.clave, f.valor]));
            const wa = mapa.get(CLAVE_WHATSAPP);
            if (wa) {
                resultado.whatsappNumero = wa;
            }
            for (const { clave, campo } of CLAVES_TIENDA) {
                const val = mapa.get(clave);
                if (val !== undefined) {
                    resultado[campo] = val;
                }
            }
        } catch {
            // Si la tabla aún no existe, devolver valores por defecto limpios
        }

        return resultado;
    }

    async actualizarInfoTienda(dto: ActualizarInfoTiendaDto): Promise<InfoTiendaDto> {
        await db.transaction(async (tx) => {
            for (const { clave, campo } of CLAVES_TIENDA) {
                await tx
                    .insert(configuracion)
                    .values({ clave, valor: dto[campo] })
                    .onConflictDoUpdate({
                        target: configuracion.clave,
                        set: { valor: dto[campo] },
                    });
            }
        });

        return this.obtenerInfoTienda();
    }
}
