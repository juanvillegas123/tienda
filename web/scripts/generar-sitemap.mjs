/**
 * Regenera web/public/sitemap.xml y actualiza la URL de Sitemap en web/public/robots.txt.
 *
 * Uso:
 *   npm run sitemap
 *   SITE_URL=https://tu-dominio.pages.dev API_URL=https://tu-api.onrender.com/api npm run sitemap
 *
 * Si la API no responde, termina sin error (exit 0) y genera las páginas fijas.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');

function leerEnvFallback() {
    try {
        const prodContent = readFileSync(
            resolve(webRoot, 'src/environments/environment.prod.ts'),
            'utf8',
        );
        const prodSite = prodContent.match(/siteUrl:\s*['"]([^'"]*)['"]/)?.[1]?.trim() || '';
        const devContent = readFileSync(
            resolve(webRoot, 'src/environments/environment.ts'),
            'utf8',
        );
        const devSite = devContent.match(/siteUrl:\s*['"]([^'"]*)['"]/)?.[1]?.trim() || '';
        const devApi = devContent.match(/apiUrl:\s*['"]([^'"]*)['"]/)?.[1]?.trim() || '';
        return { prodSite, devSite, devApi };
    } catch {
        return { prodSite: '', devSite: '', devApi: '' };
    }
}

function slugify(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function escaparXml(valor) {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function fetchJsonConTimeout(url, ms = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function main() {
    const envFallback = leerEnvFallback();
    const siteUrlRaw = process.env.SITE_URL?.trim() || envFallback.prodSite || envFallback.devSite;
    if (!process.env.SITE_URL && !envFallback.prodSite) {
        console.warn(
            '[sitemap] AVISO: environment.prod.ts no tiene siteUrl ni se definió SITE_URL. Usando URL local de respaldo:',
            siteUrlRaw || 'http://localhost:4200',
        );
    }
    const siteUrl = (siteUrlRaw || 'http://localhost:4200').replace(/\/+$/, '');
    const apiUrl = (process.env.API_URL?.trim() || envFallback.devApi || 'http://localhost:3000/api').replace(
        /\/+$/,
        '',
    );

    const urls = [
        { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
        { loc: `${siteUrl}/catalogo`, changefreq: 'daily', priority: '0.9' },
    ];

    const [categorias, productos] = await Promise.all([
        fetchJsonConTimeout(`${apiUrl}/categorias`),
        fetchJsonConTimeout(`${apiUrl}/productos`),
    ]);

    if (Array.isArray(categorias)) {
        for (const cat of categorias) {
            const slug = slugify(cat?.nombre || cat?.slug);
            if (slug) {
                urls.push({
                    loc: `${siteUrl}/catalogo/${slug}`,
                    changefreq: 'daily',
                    priority: '0.8',
                });
            }
        }
    } else {
        console.warn('[sitemap] No se pudo consultar /categorias; se incluirán solo páginas fijas.');
    }

    if (Array.isArray(productos)) {
        for (const prod of productos) {
            if (!prod?.id || !prod?.nombre) continue;
            const slug = slugify(prod.nombre);
            const ruta = slug ? `${prod.id}-${slug}` : String(prod.id);
            urls.push({
                loc: `${siteUrl}/producto/${ruta}`,
                changefreq: 'weekly',
                priority: '0.7',
            });
        }
    } else {
        console.warn('[sitemap] No se pudo consultar /productos; se omiten URLs de productos.');
    }

    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls
            .map(
                (u) =>
                    `  <url>\n` +
                    `    <loc>${escaparXml(u.loc)}</loc>\n` +
                    `    <changefreq>${u.changefreq}</changefreq>\n` +
                    `    <priority>${u.priority}</priority>\n` +
                    `  </url>`,
            )
            .join('\n') +
        `\n</urlset>\n`;

    writeFileSync(resolve(webRoot, 'public/sitemap.xml'), xml, 'utf8');

    const robots =
        `User-agent: *\n` +
        `Allow: /\n` +
        `Disallow: /admin\n` +
        `Disallow: /admin/\n` +
        `Disallow: /carrito\n\n` +
        `Sitemap: ${siteUrl}/sitemap.xml\n`;
    writeFileSync(resolve(webRoot, 'public/robots.txt'), robots, 'utf8');

    console.log(`[sitemap] Generado public/sitemap.xml con ${urls.length} URL(s) para ${siteUrl}.`);
}

await main();
