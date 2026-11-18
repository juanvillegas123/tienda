import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
    throw new Error(
        'Falta configurar la variable de entorno TURSO_DATABASE_URL en el archivo api/.env.\n' +
        'Crea un archivo api/.env copiando api/.env.example y define:\n' +
        '- Para desarrollo local con SQLite: TURSO_DATABASE_URL="file:local.db"\n' +
        '- Para Turso en la nube: TURSO_DATABASE_URL="libsql://tu-db.turso.io" y TURSO_AUTH_TOKEN="tu-token"\n' +
        '- JWT_SECRET="tu-clave-secreta"\n'
    );
}

const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle({ client, schema });
