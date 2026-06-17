/* ============================================================================
 *  Migración a la nube: sube los productos de data.js + sus fotos a Supabase.
 *  Sin dependencias (usa fetch de Node 18+).
 *
 *  CÓMO CORRERLO (una sola vez), parado en la carpeta del microsite:
 *
 *    Windows (PowerShell):
 *      $env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
 *      $env:SUPABASE_SERVICE_KEY="LA-SERVICE-ROLE-SECRET"
 *      node nube/seed-nube.js
 *
 *  La service_role NO queda guardada en ningún archivo del sitio: la usás
 *  solo para esta migración y listo.
 * ========================================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BASE = path.join(__dirname, "..");
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

if (!URL || !KEY) {
  console.error("\nFaltan variables de entorno:\n  SUPABASE_URL y SUPABASE_SERVICE_KEY\nVer instrucciones arriba en este archivo.\n");
  process.exit(1);
}

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };
const safe = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "foto";

function leerSiteData() {
  const sandbox = { window: {} };
  const code = fs.readFileSync(path.join(BASE, "data.js"), "utf8");
  new Function("window", code)(sandbox.window);
  return sandbox.window.SITE_DATA;
}

async function subirFoto(prodId, idx, rel) {
  const abs = path.join(BASE, rel);
  if (!fs.existsSync(abs)) { console.warn("   ⚠ no existe:", rel); return null; }
  const ext = (rel.split(".").pop() || "jpg").toLowerCase();
  const objPath = `${prodId}/${String(idx).padStart(2, "0")}-${safe(path.basename(rel, "." + ext))}.${ext}`;
  const buf = fs.readFileSync(abs);
  const res = await fetch(`${URL}/storage/v1/object/fotos/${encodeURI(objPath)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": MIME[ext] || "application/octet-stream", "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) { console.warn("   ⚠ error subiendo", rel, await res.text()); return null; }
  return `${URL}/storage/v1/object/public/fotos/${encodeURI(objPath)}`;
}

async function insertarProducto(row) {
  const res = await fetch(`${URL}/rest/v1/productos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function guardarConfig(cfg) {
  const fila = {
    id: 1,
    titulo: cfg.titulo || "", subtitulo: cfg.subtitulo || "",
    whatsapp_numero: (cfg.whatsappNumero || "").replace(/[^\d]/g, ""),
    retiro: cfg.retiro || "", dolar_api: cfg.dolarApi || "https://dolarapi.com/v1/dolares/blue",
    dolar_fallback: cfg.dolarFallback || 1300, nota_precios: cfg.notaPrecios || "",
  };
  const res = await fetch(`${URL}/rest/v1/config?id=eq.1`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(fila),
  });
  if (!res.ok) console.warn("⚠ config:", await res.text());
}

(async () => {
  const data = leerSiteData();
  if (!data || !data.items) { console.error("No pude leer data.js"); process.exit(1); }
  console.log(`Migrando ${data.items.length} productos a ${URL} …\n`);

  let i = 0;
  for (const it of data.items) {
    i++;
    const id = crypto.randomUUID();
    console.log(`(${i}/${data.items.length}) ${it.nombre}`);
    const fotos = [];
    const src = Array.isArray(it.fotos) ? it.fotos : (it.foto ? [it.foto] : []);
    let k = 0;
    for (const rel of src) {
      const url = await subirFoto(id, k++, rel);
      if (url) fotos.push(url);
    }
    await insertarProducto({
      id, orden: i * 10, nombre: it.nombre, modelo: it.modelo || "",
      categoria: it.categoria || "Otros", unidades: it.unidades || 1,
      precio_usd: it.precioUSD || 0, precio_lista_usd: it.precioListaUSD ?? null,
      comentario: it.comentario || "", tipo: it.tipo || null,
      componentes: Array.isArray(it.componentes) ? it.componentes : [],
      fotos, publicado: true,
    });
    console.log(`   ✓ ${fotos.length} foto(s)`);
  }

  await guardarConfig(data.config || {});
  console.log("\n✅ Migración completa. Abrí admin.html y entrá con tu usuario.");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
