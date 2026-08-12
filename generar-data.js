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

  /* ==== BAULERAS · relevamiento 07/08/2026 ====================================
   * Objetos de las 4 bauleras (48, NN1, NN2 y Piso 2-18).
   * Los que todavía no tienen carpeta en img/ se publican SIN foto (ver
   * PENDIENTES abajo): app.js ya muestra un placeholder cuando fotos = [].
   * Para sumarle fotos a uno: creá img/<NOMBRE EXACTO DE PENDIENTES>/ con las
   * imágenes y volvé a correr "node generar-data.js". Nada más que hacer.
   * ========================================================================= */

  { match: ["banqueta", "madera"], orden: 46, categoria: "Sillas y banquetas", precioUSD: 100,
    nombre: "Banquito / Ottoman Mid-Century con Patas de Madera",
    modelo: "Mid-century · patas de madera",
    comentario: "Banquito / ottoman estilo mid-century con patas de madera. Sirve como asiento extra, apoyapiés o mesa auxiliar. Usado, en buen estado." },

  { match: ["combo", "sillas", "ergonomicas"], orden: 91, categoria: "Combos", precioUSD: 1000, tipo: "combo", componentes: ["10× Silla ergonómica Alliani con cabezal y respaldo alto"],
    nombre: "¡COMBO x 10! Sillas ergonómicas con cabezal",
    modelo: "Alliani",
    comentario: "Diez sillas ergonómicas Alliani con cabezal y respaldo alto, a precio de combo. Ideal para equipar una oficina entera de una. Usadas, en buen estado." },

  { match: ["ssd", "sandisk", "extreme"], orden: 100, categoria: "Tecnología", precioUSD: 95, precioListaUSD: 130, unidades: 2,
    nombre: "SSD SanDisk Extreme Portable 2TB",
    modelo: "SanDisk Extreme Portable SSD · 2 TB · USB-C",
    comentario: "Disco SSD externo SanDisk Extreme Portable de 2 TB. Ultra rápido, resistente a golpes y salpicaduras, con conexión USB-C. Ideal para edición de video y backups. Usado, funcionando." },

  { match: ["disco", "externo", "elements"], orden: 101, categoria: "Tecnología", precioUSD: 45,
    nombre: "Disco Externo WD Elements",
    modelo: "Western Digital Elements · portátil · USB 3.0",
    comentario: "Disco rígido externo portátil Western Digital Elements con caja original. Conexión USB 3.0, plug and play. Usado, funcionando." },

  { match: ["discos", "rigidos", "internos"], orden: 102, categoria: "Tecnología", precioUSD: 20, unidades: 4,
    nombre: "Discos Rígidos Internos 3.5\"",
    modelo: "Western Digital · 3.5\" · SATA",
    comentario: "Discos rígidos internos de 3.5\" marca Western Digital, formato SATA para PC de escritorio. Se venden por unidad. Usados, a testear." },

  { match: ["nas", "lenovo"], orden: 103, categoria: "Tecnología", precioUSD: 120,
    nombre: "NAS / Mini PC Lenovo",
    modelo: "Lenovo · equipo compacto",
    comentario: "Equipo compacto Lenovo tipo NAS / mini PC. Ideal para almacenamiento en red o servidor casero. Usado." },

  { match: ["tabletas", "wacom", "intuos"], orden: 104, categoria: "Tecnología", precioUSD: 60, precioListaUSD: 85, unidades: 3,
    nombre: "Tabletas Wacom Intuos",
    modelo: "Wacom Intuos · tableta digitalizadora",
    comentario: "Tabletas digitalizadoras Wacom Intuos, el estándar para dibujo e ilustración digital. Se venden por unidad. Usadas, funcionando." },

  { match: ["oculus", "quest"], orden: 105, categoria: "Tecnología", precioUSD: 130,
    nombre: "Oculus Quest 1",
    modelo: "Meta Oculus Quest (1ra gen) · VR autónomo",
    comentario: "Visor de realidad virtual Oculus Quest de primera generación. Autónomo, no necesita PC. Incluye estuches y manuales. Usado, funcionando." },

  { match: ["camara", "ptz", "tongveo"], orden: 106, categoria: "Tecnología", precioUSD: 140, precioListaUSD: 190,
    nombre: "Cámara PTZ Tongveo",
    modelo: "Tongveo · PTZ robótica para videoconferencia",
    comentario: "Cámara robótica PTZ Tongveo para videoconferencias: hace paneo, inclinación y zoom por control remoto. Ideal para salas de reunión. Incluye cables y accesorios. Usada." },

  { match: ["gabinetes", "blancos"], orden: 108, categoria: "Tecnología", precioUSD: 55, unidades: 3,
    nombre: "Gabinetes de PC Blancos",
    modelo: "NZXT / MSI · torre ATX blanca",
    comentario: "Gabinetes de PC blancos marca NZXT y MSI, formato torre. Muy buena terminación y flujo de aire. Se venden por unidad. Usados." },

  { match: ["gabinetes", "negros"], orden: 109, categoria: "Tecnología", precioUSD: 35, unidades: 5,
    nombre: "Gabinetes de PC Negros",
    modelo: "Torre ATX negra",
    comentario: "Gabinetes de PC negros formato torre. Se venden por unidad. Usados." },

  { match: ["webcam", "720p"], orden: 110, categoria: "Tecnología", precioUSD: 12, unidades: 2,
    nombre: "Webcam HD 720P",
    modelo: "Web Camera HD 720P · USB",
    comentario: "Cámaras web HD 720P con conexión USB, en su caja original. Sin uso." },

  { match: ["auriculares", "gamer"], orden: 111, categoria: "Tecnología", precioUSD: 20,
    nombre: "Auriculares Gamer",
    modelo: "Vincha gamer · con micrófono · cableados",
    comentario: "Auriculares gamer con micrófono, almohadillas cómodas y detalles en azul. Conexión cableada. Usados, funcionando." },

  { match: ["teclados"], orden: 112, categoria: "Tecnología", precioUSD: 8, unidades: 3,
    nombre: "Teclados USB",
    modelo: "Genius · cableado USB · español",
    comentario: "Teclados de PC cableados USB, distribución en español. Se venden por unidad. Usados, funcionando." },

  { match: ["fuente", "konne", "12v"], orden: 114, categoria: "Tecnología", precioUSD: 25,
    nombre: "Fuente Konne 12V",
    modelo: "Konne NS-150-12 · fuente switching 12V",
    comentario: "Fuente switching Konne NS-150-12 de 12V, para tiras LED, CCTV o proyectos electrónicos. Usada." },

  { match: ["coolers"], orden: 115, categoria: "Tecnología", precioUSD: 4, unidades: 10,
    nombre: "Coolers de PC",
    modelo: "Ventiladores de gabinete",
    comentario: "Coolers / ventiladores de gabinete de PC. Se venden por unidad. Usados." },

  { match: ["frigobar"], orden: 150, categoria: "Electrodomésticos", precioUSD: 110,
    nombre: "Frigobar",
    modelo: "Heladera pequeña · blanca",
    comentario: "Frigobar / heladera pequeña blanca, ideal para oficina, quincho o habitación. Funcionando. Tiene la manija algo amarillenta por el uso." },

  { match: ["ventilador", "industrial", "piso"], orden: 151, categoria: "Electrodomésticos", precioUSD: 60,
    nombre: "Ventilador Industrial de Piso",
    modelo: "Industrial · metálico · de pie",
    comentario: "Ventilador industrial de piso con estructura metálica y rejilla cromada. Mucho caudal de aire, ideal para depósito, taller o galpón. Usado, funcionando." },

  { match: ["ventiladores", "industriales", "pared"], orden: 152, categoria: "Electrodomésticos", precioUSD: 60, unidades: 2,
    nombre: "Ventiladores Industriales de Pared",
    modelo: "Industrial · rejilla negra",
    comentario: "Ventiladores industriales con rejilla negra, tipo pared. Buen caudal para espacios grandes. Se venden por unidad. Usados." },

  { match: ["aire", "acondicionado", "portatil"], orden: 160, categoria: "Climatización", precioUSD: 150,
    nombre: "Aire Acondicionado Portátil",
    modelo: "Portátil · con ruedas",
    comentario: "Aire acondicionado portátil blanco con ruedas. No requiere instalación: se enchufa y se saca el tubo por la ventana. Usado, funcionando." },

  { match: ["deshumidificador"], orden: 161, categoria: "Climatización", precioUSD: 150,
    nombre: "Deshumidificador / AC Portátil",
    modelo: "A confirmar",
    comentario: "Equipo portátil de climatización blanco. Usado." },

  { match: ["sofa", "chesterfield", "capitone"], orden: 200, categoria: "Mobiliario", precioUSD: 320, precioListaUSD: 420,
    nombre: "Sofá Chesterfield Capitoné Gris",
    modelo: "Chesterfield · capitoné · base de madera",
    comentario: "Sofá estilo Chesterfield tapizado en pana gris con capitoné profundo y base de madera maciza. Pieza de mucho carácter, ideal para living o recepción. Usado, en muy buen estado." },

  { match: ["sofa", "cuerpos", "gris"], orden: 201, categoria: "Mobiliario", precioUSD: 260, precioListaUSD: 330,
    nombre: "Sofá 3 Cuerpos Gris",
    modelo: "3 cuerpos · tapizado chenille gris",
    comentario: "Sofá de 3 cuerpos tapizado en chenille gris oscuro. Amplio y cómodo, líneas simples que combinan con todo. Usado, en muy buen estado." },

  { match: ["modulo", "respaldo", "sofa"], orden: 202, categoria: "Mobiliario", precioUSD: 90,
    nombre: "Módulo de Sofá Gris",
    modelo: "Módulo suelto · tapizado gris",
    comentario: "Módulo / respaldo de sofá tapizado en gris. Sirve como asiento suelto o para completar un sofá modular. Usado." },

  { match: ["barra", "madera", "maciza"], orden: 210, categoria: "Mobiliario", precioUSD: 180,
    nombre: "Barra de Madera Maciza",
    modelo: "Tapa de madera maciza · base de hierro negro",
    comentario: "Barra / mesada larga con tapa de madera maciza y base de hierro negro estilo industrial. Ideal para cocina, office o espacio de trabajo compartido. Usada, en muy buen estado." },

  { match: ["mesa", "industrial", "madera"], orden: 211, categoria: "Mobiliario", precioUSD: 150,
    nombre: "Mesa Industrial de Madera y Hierro",
    modelo: "Tapa de madera maciza · base de hierro negro",
    comentario: "Mesa / escritorio estilo industrial con tapa de madera maciza gruesa y base de hierro negro. Robusta y con mucha presencia. Usada." },

  { match: ["estanterias", "hierro", "madera"], orden: 212, categoria: "Mobiliario", precioUSD: 120, unidades: 4,
    nombre: "Estanterías de Hierro y Madera",
    modelo: "Rack industrial · hierro negro + estantes de madera",
    comentario: "Estanterías / racks estilo industrial con estructura de hierro negro y estantes de madera. Muy resistentes, ideales para depósito, local o living. Se venden por módulo. Usadas." },

  { match: ["tablones", "madera", "maciza"], orden: 213, categoria: "Mobiliario", precioUSD: 45, unidades: 5,
    nombre: "Tablones de Madera Maciza",
    modelo: "Tapa / tablón de madera maciza",
    comentario: "Tablones de madera maciza, ideales como tapa de mesa, estante o barra. Se venden por unidad. Usados." },

  { match: ["vitrina", "negra", "con"], orden: 214, categoria: "Mobiliario", precioUSD: 140,
    nombre: "Vitrina Negra con Vidrio",
    modelo: "Mueble vitrina · estructura negra + vidrio",
    comentario: "Vitrina / mueble expositor con estructura negra y puertas de vidrio. Ideal para local, oficina o para exhibir objetos. Usada." },

  { match: ["estanteria", "madera", "oscura"], orden: 215, categoria: "Mobiliario", precioUSD: 110,
    nombre: "Estantería de Madera Oscura",
    modelo: "Madera oscura",
    comentario: "Estantería / mueble de madera oscura. Sólida y de buen porte. Usada." },

  { match: ["sommier", "tapizado", "rojo"], orden: 216, categoria: "Mobiliario", precioUSD: 130,
    nombre: "Sommier Tapizado Rojo",
    modelo: "2 plazas · tapizado rojo",
    comentario: "Sommier / base de cama de 2 plazas tapizada en pana roja. Usado, en buen estado." },

  { match: ["colchon", "futon", "blanco"], orden: 217, categoria: "Mobiliario", precioUSD: 60,
    nombre: "Colchón / Futón Blanco",
    modelo: "Futón · blanco",
    comentario: "Colchón / futón blanco. Usado." },

  { match: ["pizarra", "blanca", "grande"], orden: 218, categoria: "Mobiliario", precioUSD: 60,
    nombre: "Pizarra Blanca Grande",
    modelo: "Pizarra / espejo · marco negro",
    comentario: "Pizarra blanca de gran tamaño con marco negro. Ideal para oficina, aula o sala de reuniones. Usada." },

  { match: ["respaldo", "madera", "metal"], orden: 219, categoria: "Mobiliario", precioUSD: 35,
    nombre: "Respaldo de Madera y Metal",
    modelo: "Marco rectangular · varillas de madera",
    comentario: "Panel / respaldo decorativo con marco rectangular de metal y varillas de madera. Sirve como cabecera, divisor o pieza decorativa. Usado." },

  { match: ["rack", "servidores"], orden: 220, categoria: "Tecnología", precioUSD: 180,
    nombre: "Rack de Servidores 19\"",
    modelo: "Gabinete rack 19\" · negro",
    comentario: "Gabinete rack de 19\" para servidores y equipamiento de red. Estructura metálica negra con puerta. Usado." },

  { match: ["mamparas", "vidrio", "con"], orden: 221, categoria: "Mobiliario", precioUSD: 90, unidades: 2,
    nombre: "Mamparas de Vidrio",
    modelo: "Vidrio · marco de aluminio",
    comentario: "Mamparas / ventanas de vidrio con marco de aluminio. Sirven para dividir ambientes de oficina. Se venden por unidad. Usadas." },

  { match: ["silla", "ergonomica", "blanca"], orden: 300, categoria: "Sillas y banquetas", precioUSD: 110,
    nombre: "Silla Ergonómica Blanca",
    modelo: "Ergonómica · blanca · respaldo de malla gris",
    comentario: "Silla ergonómica de oficina blanca con respaldo de malla gris transpirable. Regulable en altura, con apoyabrazos. Usada, en buen estado." },

  { match: ["sillas", "oficina", "blancas"], orden: 301, categoria: "Sillas y banquetas", precioUSD: 70, unidades: 3,
    nombre: "Sillas de Oficina Blancas",
    modelo: "Base araña blanca · a armar",
    comentario: "Sillas de oficina blancas con base araña de 5 patas. Están desarmadas (asiento, respaldo y base por separado), se arman fácil. Se venden por unidad. Usadas." },

  { match: ["sillas", "plasticas", "blancas"], orden: 302, categoria: "Sillas y banquetas", precioUSD: 30, unidades: 3,
    nombre: "Sillas Plásticas Blancas",
    modelo: "Tipo medallón · plástico blanco",
    comentario: "Sillas plásticas blancas estilo medallón, apilables. Livianas y fáciles de guardar. Se venden por unidad. Usadas." },

  { match: ["sillas", "celestes", "tipo"], orden: 303, categoria: "Sillas y banquetas", precioUSD: 25, unidades: 4,
    nombre: "Sillas Celestes Tipo Auditorio",
    modelo: "Asiento plástico celeste · tipo auditorio",
    comentario: "Sillas con asiento plástico celeste, tipo auditorio / escolar. Apilables y resistentes. Se venden por unidad. Usadas." },

  { match: ["sillas", "tolix", "celestes"], orden: 304, categoria: "Sillas y banquetas", precioUSD: 45, unidades: 2,
    nombre: "Sillas Metálicas Celestes",
    modelo: "Tipo Tolix · metálica celeste",
    comentario: "Sillas metálicas celestes estilo Tolix, un clásico del diseño industrial. Apilables, sirven para interior y exterior. Se venden por unidad. Usadas." },

  { match: ["parrilla", "hierro"], orden: 400, categoria: "Otros", precioUSD: 50,
    nombre: "Parrilla de Hierro",
    modelo: "Parrilla para asador · hierro",
    comentario: "Parrilla de hierro para asador, de buen tamaño. Tiene marcas de uso y algo de óxido superficial, normal para el uso. Sólida." },

  { match: ["carpa", "xtreme", "personas"], orden: 401, categoria: "Otros", precioUSD: 45,
    nombre: "Carpa Xtreme 4 Personas",
    modelo: "Xtreme · 4 personas · 220×160×210×120 cm",
    comentario: "Carpa para 4 personas marca Xtreme, en su bolso original. Columnas de agua 800 mm, costuras termoselladas. Medidas 220×160×210×120 cm." },

  { match: ["escalera", "aluminio"], orden: 402, categoria: "Otros", precioUSD: 70,
    nombre: "Escalera de Aluminio",
    modelo: "Tipo tijera · aluminio",
    comentario: "Escalera de aluminio tipo tijera, liviana y estable. Usada, en buen estado." },

  { match: ["valijas", "rigidas", "rojas"], orden: 410, categoria: "Equipaje", precioUSD: 50, unidades: 2,
    nombre: "Valijas Rígidas Rojas",
    modelo: "Rígida · grande · con ruedas",
    comentario: "Valijas rígidas rojas grandes con ruedas y cierre con candado. Se venden por unidad. Usadas." },

  { match: ["valija", "express", "negra"], orden: 411, categoria: "Equipaje", precioUSD: 35,
    nombre: "Valija Express Negra",
    modelo: "Blanda · grande · marca Express",
    comentario: "Valija blanda grande marca Express, color negro. Usada." },

  { match: ["valija", "morada"], orden: 412, categoria: "Equipaje", precioUSD: 35,
    nombre: "Valija Morada",
    modelo: "Blanda · grande · morada",
    comentario: "Valija blanda grande color morado. Usada." },

  { match: ["valijas", "rigidas", "nn1"], orden: 413, categoria: "Equipaje", precioUSD: 45, unidades: 2,
    nombre: "Valijas Rígidas",
    modelo: "Rígidas · negra y celeste · con ruedas",
    comentario: "Valijas rígidas con ruedas, una negra y una celeste. Se venden por unidad. Usadas." },

  { match: ["redoblante"], orden: 420, categoria: "Otros", precioUSD: 70,
    nombre: "Redoblante",
    modelo: "Tambor / redoblante de batería",
    comentario: "Redoblante / tambor de batería con cuerpo de madera. Usado." },

  { match: ["manguera", "led", "blanca"], orden: 421, categoria: "Otros", precioUSD: 40,
    nombre: "Manguera LED Blanca",
    modelo: "Manguera LED · rollos · blanco frío",
    comentario: "Lote de manguera LED blanca en rollos, con sus fichas. Ideal para decoración de eventos, fiestas o cartelería. Usada." },

  { match: ["plafones", "led", "circulares"], orden: 422, categoria: "Otros", precioUSD: 12, unidades: 6,
    nombre: "Plafones LED Circulares",
    modelo: "Plafón LED circular · blanco",
    comentario: "Plafones / lámparas LED circulares blancas. Se venden por unidad. Usadas." },

  { match: ["lote", "cables"], orden: 423, categoria: "Otros", precioUSD: 60,
    nombre: "Lote de Cables",
    modelo: "HDMI · DVI · DisplayPort · red · USB · alimentación",
    comentario: "Lote grande de cables clasificados y rotulados por tipo: HDMI, DVI, DisplayPort, cables de red UTP, USB y cables de alimentación. Vienen en sus cajas organizadoras. Ideal para oficina o setup completo." },

  { match: ["zapatillas", "controladores", "led"], orden: 424, categoria: "Otros", precioUSD: 15,
    nombre: "Zapatillas y Controladores LED",
    modelo: "Zapatilla Atomlux + 2 LED Controllers",
    comentario: "Lote de electricidad: zapatilla / regleta Atomlux y dos controladores de tiras LED. Usados." },

  { match: ["cuadros", "marcos", "negros"], orden: 425, categoria: "Otros", precioUSD: 10, unidades: 4,
    nombre: "Cuadros y Marcos Negros",
    modelo: "Marco de madera negro",
    comentario: "Cuadros / marcos de madera negros. Se venden por unidad. Usados." },

  { match: ["papeleras", "malla", "metalica"], orden: 426, categoria: "Otros", precioUSD: 8, unidades: 3,
    nombre: "Papeleras de Malla Metálica",
    modelo: "Cesto de malla metálica",
    comentario: "Papeleras / cestos de malla metálica para oficina. Se venden por unidad. Usadas." },
];


/* Items publicados SIN foto todavía. El nombre es el que tiene que llevar la
 * carpeta en img/ cuando saques las fotos. */
const PENDIENTES = [
  "BANQUETA MADERA",
  "COMBO SILLAS ERGONOMICAS CON CABEZAL X10",
  "SSD SANDISK EXTREME 2TB",
  "DISCO EXTERNO WD ELEMENTS",
  "DISCOS RIGIDOS INTERNOS 3.5",
  "NAS LENOVO",
  "TABLETAS WACOM INTUOS",
  "OCULUS QUEST 1",
  "CAMARA PTZ TONGVEO",
  "GABINETES PC BLANCOS",
  "GABINETES PC NEGROS",
  "WEBCAM HD 720P",
  "AURICULARES GAMER",
  "TECLADOS",
  "FUENTE KONNE 12V",
  "COOLERS PC",
  "FRIGOBAR",
  "VENTILADOR INDUSTRIAL DE PISO",
  "VENTILADORES INDUSTRIALES DE PARED",
  "AIRE ACONDICIONADO PORTATIL",
  "DESHUMIDIFICADOR",
  "SOFA CHESTERFIELD CAPITONE GRIS",
  "SOFA 3 CUERPOS GRIS",
  "MODULO RESPALDO SOFA GRIS",
  "BARRA DE MADERA MACIZA",
  "MESA INDUSTRIAL MADERA Y HIERRO",
  "ESTANTERIAS HIERRO Y MADERA",
  "TABLONES DE MADERA MACIZA",
  "VITRINA NEGRA CON VIDRIO",
  "ESTANTERIA DE MADERA OSCURA",
  "SOMMIER TAPIZADO ROJO 2 PLAZAS",
  "COLCHON FUTON BLANCO",
  "PIZARRA BLANCA GRANDE",
  "RESPALDO DE MADERA Y METAL",
  "RACK DE SERVIDORES 19",
  "MAMPARAS DE VIDRIO CON MARCO DE ALUMINIO",
  "SILLA ERGONOMICA BLANCA MALLA",
  "SILLAS DE OFICINA BLANCAS",
  "SILLAS PLASTICAS BLANCAS MEDALLON",
  "SILLAS CELESTES TIPO AUDITORIO",
  "SILLAS TOLIX CELESTES",
  "PARRILLA DE HIERRO",
  "CARPA XTREME 4 PERSONAS",
  "ESCALERA DE ALUMINIO",
  "VALIJAS RIGIDAS ROJAS",
  "VALIJA EXPRESS NEGRA",
  "VALIJA MORADA",
  "VALIJAS RIGIDAS NN1",
  "REDOBLANTE",
  "MANGUERA LED BLANCA",
  "PLAFONES LED CIRCULARES",
  "LOTE DE CABLES",
  "ZAPATILLAS Y CONTROLADORES LED",
  "CUADROS Y MARCOS NEGROS",
  "PAPELERAS DE MALLA METALICA",
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
    nombre: ov.nombre || titulo(carpeta),
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

/* Items sin carpeta de fotos todavía → se publican con placeholder. */
const yaGeneradas = new Set(items.map((it) => norm(it.carpeta)));
const sinFoto = [];
for (const nombreCarpeta of PENDIENTES) {
  if (yaGeneradas.has(norm(nombreCarpeta))) continue; // ya tiene fotos: no duplicar
  const ov = overrideDe(nombreCarpeta) || {};
  const it = {
    id: ov.id || (ov.orden ? ov.orden : ++autoId),
    nombre: ov.nombre || titulo(nombreCarpeta),
    modelo: ov.modelo || "",
    categoria: ov.categoria || "Otros",
    unidades: ov.unidades || 1,
    precioUSD: ov.precioUSD != null ? ov.precioUSD : 0,
    comentario: ov.comentario || "",
    carpeta: nombreCarpeta,
    fotos: [],
    foto: null,
  };
  if (ov.tipo) it.tipo = ov.tipo;
  if (ov.componentes) it.componentes = ov.componentes;
  if (ov.precioListaUSD != null) it.precioListaUSD = ov.precioListaUSD;
  it._orden = ov.orden != null ? ov.orden : 500;
  items.push(it);
  sinFoto.push(it.nombre);
}

items.sort((a, b) => a._orden - b._orden);
items.forEach((it) => delete it._orden);

const out = "/* GENERADO por generar-data.js — no editar a mano; editá el generador. */\n"
  + "window.SITE_DATA = " + JSON.stringify({ config: CONFIG, items }, null, 2) + ";\n";
fs.writeFileSync("data.js", out);

console.log(`OK · ${items.length} publicaciones generadas.`);
items.forEach((it) => console.log(`  [${it.fotos.length} foto${it.fotos.length === 1 ? "" : "s"}] ${it.nombre}  (${it.categoria}${it.precioUSD ? " · USD " + it.precioUSD : " · SIN PRECIO"})`));
if (vacias.length) console.log("\nCarpetas VACÍAS (no publicadas todavía): " + vacias.join(", "));
if (sinFoto.length) {
  console.log("\nPublicados SIN FOTO (" + sinFoto.length + ") — creá img/<nombre>/ y volvé a correr:");
  sinFoto.forEach((n) => console.log("  · " + n));
}
const sinPrecio = items.filter((it) => !it.precioUSD);
if (sinPrecio.length) console.log("\nSIN PRECIO (" + sinPrecio.length + "): " + sinPrecio.map((i) => i.nombre).join(", "));
