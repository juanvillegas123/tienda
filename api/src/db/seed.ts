import 'dotenv/config';
import * as argon2 from 'argon2';
import { db } from './db';
import { administradora } from './schema';

async function main() {
    const usuario = process.argv[2];
    const clave = process.argv[3];
    if (!usuario || !clave) {
        console.error('Uso: npx tsx src/db/seed.ts <usuario> <clave>');
        process.exit(1);
    }
    const hash = await argon2.hash(clave, { type: argon2.argon2id });
    await db
        .insert(administradora)
        .values({ usuario, contrasenaCifrada: hash })
        .onConflictDoUpdate({
            target: administradora.usuario,
            set: {
                contrasenaCifrada: hash,
                intentosFallidos: 0,
                bloqueadaHasta: null,
            },
        });
    console.log(`Administradora '${usuario}' configurada exitosamente`);
}

void main();
