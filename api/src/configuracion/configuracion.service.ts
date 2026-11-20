import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { configuracion } from '../db/schema';

const CLAVE_WHATSAPP = 'whatsapp_numero';

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
            // Respaldo seguro si la tabla aún no fue creada con db:push
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
}
