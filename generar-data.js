/* ============================================================================
 *  GENERADOR DE data.js  —  3dar · microsite de venta
 *  ----------------------------------------------------------------------------
 *  Escanea las carpetas dentro de img/ y arma una publicación por carpeta:
 *    · título  = nombre de la carpeta (prolijo)
 *    · fotos   = TODAS las imágenes de la carpeta (ordenadas) → galería + lightbox
 *  Los datos curados (precio, categoría, modelo, texto) están en OVERRIDES,
 *  que se emparejan de forma "tolerante" (por palabras clave), así aguanta
 *  renombres de carpeta y carpetas nuevas.
 *
 *  CÓMO USARLO:  parado en la carpeta del microsite, correr:
 *      node generar-data.js
 *  Regenera data.js con lo que haya en las carpetas en ese momento.
 * ========================================================================== */
const fs = require("fs");
const path = require("path");

const IMG_DIR = "img";
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const CONFIG = {
  titulo: "Liquidación de equipamiento",
  subtitulo: "Muebles, sillas, electrodomésticos y tecnología en venta. Se retira por baulera en Av. Elcano y Fraga (CABA).",
  whatsappNumero: "5491161995651",
  whatsappNota: "Número de contacto de la venta (código país sin + ni espacios).",
  retiro: "Se retira por la baulera de Av. Elcano y Fraga (CABA).",
  dolarApi: "https://dolarapi.com/v1/dolares/blue",
  dolarFallback: 1300,
  moneda: "ARS",
  notaPrecios: "Precios sugeridos estimados a partir del mercado usado. Editables / a confirmar. Todos los objetos se retiran por la baulera de Av. Elcano y Fraga (CABA)."
};

/* OVERRIDES: el primero cuyo `match` (todas las palabras) esté contenido en el
 * nombre de la carpeta, gana. Poné los más específicos PRIMERO. */
const OVERRIDES = [
  { match: ["combo", "banqueta"], orden: 90, tipo: "combo", categoria: "Combos",
    precioUSD: 105, precioListaUSD: 120,
    componentes: ["3× Banqueta alta celeste con respaldo y patas cromadas"],
    comentario: "Tres banquetas altas celestes con respaldo y patas cromadas. Suman color y onda a cualquier barra o cocina. Llevándolas juntas, mejor precio." },

  { match: ["viewboard"], orden: 1, categoria: "Tecnología", precioUSD: 750, precioListaUSD: 950,
    modelo: "ViewBoard IFP6533 · 65\" 4K UHD",
    comentario: "Pantalla interactiva táctil 4K de 65\", ideal para salas de reunión o aulas. Incluye carro rodante con rueditas. Usada, funcionando." },

  { match: ["proyector"], orden: 2, categoria: "Tecnología", precioUSD: 200, precioListaUSD: 270,
    modelo: "BenQ MX631ST · 3200 lúmenes · DLP · XGA",
    comentario: "Proyector short-throw: pantalla grande a poca distancia. 3200 lúmenes ANSI, DLP, resolución XGA, entradas HDMI / VGA / video. Incluye control remoto. Usado, funcionando." },

  { match: ["heladera"], orden: 3, categoria: "Electrodomésticos", precioUSD: 290, precioListaUSD: 380,
    modelo: "LG GM-353QC · 340 L · 220V",
    comentario: "Heladera LG con freezer arriba, 340 litros. Enfría y congela perfecto, refrigerante ecológico R134a. Tiene calcos decorativos (se sacan fácil) y marcas menores de uso; interior impecable, estantes y cajones completos." },

  { match: ["ahumador"], orden: 4, categoria: "Electrodomésticos", precioUSD: 55, precioListaUSD: 75,
    modelo: "Lacor Instant + Campana 16×12 cm",
    comentario: "Ahumador de alimentos Instant Lacor con campana de ahumado de cristal borosilicato. Para carnes, pescados, quesos y coctelería. Súper compacto y fácil de transportar. Funciona con 4 pilas AA (no incluidas)." },

  { match: ["westinghouse"], orden: 5, categoria: "Climatización", precioUSD: 170,
    modelo: "Portátil frío/calor · panel táctil",
    comentario: "Aire acondicionado portátil frío/calor con panel táctil (modos cool/warm, timer y velocidades). No requiere instalación: lo enchufás y listo. Práctico para mover entre ambientes." },

  { match: ["mesada"], orden: 20, categoria: "Mobiliario", precioUSD: 120,
    modelo: "Mesa alta desayunador · tapa símil mármol",
    comentario: "Mesa alta tipo barra / desayunador con tapa símil mármol (vinilo granito) y pata central cromada. Perfecta para cocina, office o barra. Resistente y fácil de limpiar." },

  { match: ["mesa", "roja"], orden: 21, categoria: "Mobiliario", precioUSD: 140,
    modelo: "Tapa roja · patas metálicas reticuladas",
    comentario: "Mesa de diseño con tapa roja laqueada y patas metálicas tipo reticulado. Pieza de carácter, ideal como consola, barra o mesa de apoyo con mucha onda." },

  { match: ["escritorio", "cajonera"], orden: 22, categoria: "Mobiliario", precioUSD: 110,
    modelo: "Melamina símil roble + cajonera 3 cajones",
    comentario: "Escritorio de melamina símil roble con cajonera de 3 cajones y patas de hierro estilo industrial. Amplio y robusto, ideal para home office." },

  { match: ["escritorio", "vintage"], orden: 23, categoria: "Mobiliario", precioUSD: 130,
    modelo: "Vintage · madera",
    comentario: "Escritorio vintage de madera, con onda retro y mucho carácter. Sólido y listo para usar." },

  { match: ["escritorio", "moderno"], orden: 24, categoria: "Mobiliario", precioUSD: 160,
    modelo: "En L · moderno",
    comentario: "Escritorio en L moderno, ideal para aprovechar esquinas y ganar mucha superficie de trabajo." },

  { match: ["sillon"], orden: 25, categoria: "Mobiliario", precioUSD: 230,
    modelo: "Esquinero en L · tapizado en tela",
    comentario: "Sillón esquinero en L tapizado en tela, súper amplio y cómodo. Ideal para living, sala de estar o espacio de relax en la oficina." },

  { match: ["silla", "gris", "cabezal"], orden: 40, categoria: "Sillas y banquetas", precioUSD: 130,
    modelo: "Ergonómica · gris · con cabezal",
    comentario: "Silla ergonómica de oficina gris con cabezal y respaldo alto. Regulable en altura, con buen soporte lumbar y de cuello para jornadas largas." },

  { match: ["silla", "naranja", "cabezal"], orden: 41, categoria: "Sillas y banquetas", precioUSD: 130,
    modelo: "Ergonómica · naranja · con cabezal",
    comentario: "Silla ergonómica de oficina naranja con cabezal y respaldo alto. Regulable, con buen soporte para trabajar cómodo todo el día." },

  { match: ["silla", "gris"], orden: 42, categoria: "Sillas y banquetas", precioUSD: 105,
    modelo: "Ergonómica · gris · malla",
    comentario: "Silla ergonómica de oficina gris, respaldo de malla transpirable y regulable en altura. Cómoda y sobria para cualquier escritorio." },

  { match: ["silla", "naranja"], orden: 43, categoria: "Sillas y banquetas", precioUSD: 105,
    modelo: "Ergonómica · naranja · malla",
    comentario: "Silla ergonómica de oficina con asiento naranja, respaldo de malla transpirable y regulable en altura. Suma color y comodidad al escritorio." },

  { match: ["taburete"], orden: 44, categoria: "Sillas y banquetas", precioUSD: 50,
    modelo: "Regulable · giratorio · con ruedas",
    comentario: "Taburete / banqueta regulable en altura, con asiento giratorio y rueditas. Práctico para escritorio, taller o estudio." },

  { match: ["banqueta", "celeste"], orden: 45, categoria: "Sillas y banquetas", precioUSD: 40,
    modelo: "Banqueta alta · celeste · patas cromadas",
    comentario: "Banqueta alta celeste con respaldo y patas cromadas. Cómoda y con mucho estilo para barra, cocina u office." },
];

/* ---------- helpers ---------- */
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function overrideDe(carpeta) {
  const n = norm(carpeta); // string normalizado con espacios
  for (const ov of OVERRIDES) {
    if (ov.match.every((w) => n.includes(w))) return ov; // substring → aguanta plurales
  }
  return null;
}

// Título prolijo a partir del nombre de carpeta
const MINUS = new Set(["con", "y", "de", "la", "el", "en", "x3", "x2", "x4"]);
const TILDES = { simil: "símil", marmol: "mármol", sillon: "sillón",
  ergonomica: "ergonómica", camara: "cámara", electrico: "eléctrico",
  organico: "orgánico", tactil: "táctil", comoda: "cómoda",
  viewboard: "ViewBoard" };
function titulo(carpeta) {
  return carpeta.toLowerCase().replace(/\s+\+.*$/, "") // corta "+ campana ahumador"
    .split(/\s+/).map((w, i) => {
      if (TILDES[w]) w = TILDES[w];
      if (i > 0 && MINUS.has(w)) return w;
      if (/^x\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ").trim();
}

// número entre paréntesis para ordenar fotos (sin sufijo = 0, va primero)
const numSuf = (f) => { const m = f.match(/\((\d+)\)/); return m ? +m[1] : 0; };

function fotosDe(carpeta) {
  const dir = path.join(IMG_DIR, carpeta);
  let files = fs.readdirSync(dir).filter((f) => EXT.test(f));
  files.sort((a, b) => (numSuf(a) - numSuf(b)) || a.localeCompare(b, "es"));
  return files.map((f) => `${IMG_DIR}/${carpeta}/${f}`);
}

/* ---------- build ---------- */
const carpetas = fs.readdirSync(IMG_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name);

const items = [];
const vacias = [];
let autoId = 900;

for (const carpeta of carpetas) {
  const fotos = fotosDe(carpeta);
  if (fotos.length === 0) { vacias.push(carpeta); continue; }
  const ov = overrideDe(carpeta) || {};
  const it = {
    id: ov.id || (ov.orden ? ov.orden : ++autoId),
    nombre: titulo(carpeta),
    modelo: ov.modelo || "",
    categoria: ov.categoria || "Otros",
    unidades: ov.unidades || 1,
    precioUSD: ov.precioUSD != null ? ov.precioUSD : 0,
    comentario: ov.comentario || "",
    carpeta,
    fotos,
    foto: fotos[0],
  };
  if (ov.tipo) it.tipo = ov.tipo;
  if (ov.componentes) it.componentes = ov.componentes;
  if (ov.precioListaUSD != null) it.precioListaUSD = ov.precioListaUSD;
  it._orden = ov.orden != null ? ov.orden : 500;
  items.push(it);
}

items.sort((a, b) => a._orden - b._orden);
items.forEach((it) => delete it._orden);

const out = "/* GENERADO por generar-data.js — no editar a mano; editá el generador. */\n"
  + "window.SITE_DATA = " + JSON.stringify({ config: CONFIG, items }, null, 2) + ";\n";
fs.writeFileSync("data.js", out);

console.log(`OK · ${items.length} publicaciones generadas.`);
items.forEach((it) => console.log(`  [${it.fotos.length} foto${it.fotos.length === 1 ? "" : "s"}] ${it.nombre}  (${it.categoria}${it.precioUSD ? " · USD " + it.precioUSD : " · SIN PRECIO"})`));
if (vacias.length) console.log("\nCarpetas VACÍAS (no publicadas todavía): " + vacias.join(", "));
