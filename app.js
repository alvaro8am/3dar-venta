/* 3dar · Microsite de venta de equipamiento
 * - Carga items desde data.json
 * - Trae la cotización del dólar (blue) y muestra los precios en ARS actualizados
 * - Filtro por categoría + buscador + botón "Me interesa" por WhatsApp
 */

const state = {
  config: {},
  items: [],
  dolar: null,        // ARS por USD
  dolarLive: false,
  seccion: "todo",
  categoria: "Todas",
  busqueda: "",
  orden: "destacados", // destacados | precio-asc | precio-desc
  ofertas: {},        // { [id]: monto ARS ofertado por el usuario }
  ofertaTocada: {},   // { [id]: true } si el usuario ya modificó la oferta
};

// Secciones del sitio. El orden define el de las pestañas.
const SECCIONES = [
  { id: "todo", label: "Todo", desc: "" },
  { id: "descuentos", label: "🔥 Descuentos", desc: "Precios rebajados frente al mercado para salir rápido." },
  { id: "combos", label: "📦 Combos", desc: "Varios objetos juntos a un precio conjunto más conveniente." },
];

const esCombo = (it) => it.tipo === "combo";
const esDescuento = (it) => Number(it.precioListaUSD) > Number(it.precioUSD);
const pctDescuento = (it) =>
  Math.round((1 - Number(it.precioUSD) / Number(it.precioListaUSD)) * 100);

const $ = (sel) => document.querySelector(sel);

// Las rutas vienen de carpetas con espacios/acentos: hay que codificarlas.
const encImg = (p) => encodeURI(p);

const fmtARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtUSD = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

// Paso de oferta: ~5% del precio, redondeado a una cifra "linda" (mín. $1.000).
function pasoOferta(precio) {
  const cinco = precio * 0.05;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(cinco, 1))));
  return Math.max(1000, Math.round(cinco / mag) * mag);
}

init();

async function init() {
  // Trae datos de la nube (Supabase) o, si no está configurada, de data.js.
  const data = await window.obtenerDatos();
  state.config = data.config || {};
  state.items = data.items || [];

  const tituloEl = $("#titulo");
  if (tituloEl) tituloEl.textContent = state.config.titulo || "Venta de equipamiento";
  const subEl = $("#subtitulo");
  if (subEl) subEl.textContent = state.config.subtitulo || "";
  document.title = state.config.titulo || document.title;
  const notaEl = $("#nota-precios");
  if (notaEl) notaEl.textContent = state.config.notaPrecios || "";

  // Render inmediato con dólar de respaldo (no depende de la red).
  state.dolar = Number(state.config.dolarFallback) || 1000;
  pintarDolar(state.dolar, null, false);
  construirSecciones();
  construirFiltros();
  bindEventos();
  bindLightbox();
  render();

  // Luego intentamos la cotización en vivo y actualizamos precios.
  cargarDolar();
}

async function cargarDolar() {
  const fallback = Number(state.config.dolarFallback) || 1000;
  const api = state.config.dolarApi;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(api, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    // dolarapi.com devuelve { compra, venta, fechaActualizacion, ... }
    const valor = Number(json.venta || json.promedio || json.compra);
    if (!valor || isNaN(valor)) throw new Error("Sin valor numérico");
    state.dolar = valor;
    state.dolarLive = true;
    pintarDolar(valor, json.fechaActualizacion, true);
    render(); // re-pintar precios con la cotización en vivo
  } catch (e) {
    console.warn("Usando dólar fallback:", e.message);
    state.dolar = fallback;
    state.dolarLive = false;
    pintarDolar(fallback, null, false);
  }
}

function pintarDolar(valor, fecha, live) {
  $("#dolar-valor").textContent = fmtARS(valor);
  const dot = $("#dolar-dot");
  dot.classList.toggle("live", live);
  dot.classList.toggle("fallback", !live);
  $("#dolar-label").firstChild.textContent =
    (live ? "Dólar blue: " : "Dólar (estimado): ");
  const act = $("#dolar-actualizado");
  if (live && fecha) {
    const d = new Date(fecha);
    act.textContent = "· act. " + d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) +
      " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  } else if (!live) {
    act.textContent = "· sin conexión, valor de referencia";
  } else {
    act.textContent = "";
  }
}

function itemsDeSeccion(seccionId) {
  if (seccionId === "combos") return state.items.filter(esCombo);
  if (seccionId === "descuentos") return state.items.filter((it) => !esCombo(it) && esDescuento(it));
  return state.items; // "todo" → todo, combos incluidos
}

function construirSecciones() {
  const cont = $("#secciones");
  cont.innerHTML = "";
  SECCIONES.forEach((sec) => {
    const n = itemsDeSeccion(sec.id).length;
    if (sec.id !== "todo" && n === 0) return; // ocultar secciones vacías
    const btn = document.createElement("button");
    btn.className = "seccion-tab" + (sec.id === state.seccion ? " active" : "");
    btn.setAttribute("role", "tab");
    btn.innerHTML = `${sec.label} <span class="seccion-tab__n">${n}</span>`;
    btn.addEventListener("click", () => {
      if (state.seccion === sec.id) return;
      state.seccion = sec.id;
      state.categoria = "Todas";
      construirSecciones();
      construirFiltros();
      render();
    });
    cont.appendChild(btn);
  });

  const sec = SECCIONES.find((s) => s.id === state.seccion);
  const desc = $("#seccion-desc");
  desc.textContent = sec ? sec.desc : "";
  desc.hidden = !sec || !sec.desc;
}

function construirFiltros() {
  const cont = $("#filtros");
  cont.innerHTML = "";
  const grupo = cont.closest(".filter-group");
  // Los filtros por categoría solo aplican a la sección "Todo".
  if (state.seccion !== "todo") { if (grupo) grupo.hidden = true; return; }
  if (grupo) grupo.hidden = false;
  // Categorías de los productos sueltos (los combos tienen su propia pestaña).
  const cats = ["Todas", ...Array.from(new Set(
    state.items.filter((i) => !esCombo(i)).map((i) => i.categoria)
  )).filter((c) => c !== "Combos").sort()];
  cats.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (cat === state.categoria ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      state.categoria = cat;
      construirFiltros();
      render();
    });
    cont.appendChild(btn);
  });
}

function bindEventos() {
  $("#buscador").addEventListener("input", (e) => {
    state.busqueda = e.target.value.trim().toLowerCase();
    render();
  });

  const ordenSel = $("#orden-precio");
  if (ordenSel) ordenSel.addEventListener("change", (e) => { state.orden = e.target.value; render(); });

  // Menú desplegable "Filtrar"
  const btnF = $("#btn-filtrar");
  const menu = $("#filter-menu");
  if (btnF && menu) {
    btnF.addEventListener("click", (e) => {
      e.stopPropagation();
      const abrir = menu.hidden;
      menu.hidden = !abrir;
      btnF.classList.toggle("open", abrir);
      btnF.setAttribute("aria-expanded", String(abrir));
    });
    document.addEventListener("click", (e) => {
      if (menu.hidden) return;
      if (!menu.contains(e.target) && !btnF.contains(e.target)) {
        menu.hidden = true;
        btnF.classList.remove("open");
        btnF.setAttribute("aria-expanded", "false");
      }
    });
  }
}

function actualizarBotonFiltro() {
  const dot = $("#filter-dot");
  if (dot) dot.hidden = !(state.seccion !== "todo" || state.categoria !== "Todas" || state.orden !== "destacados");
}

function itemsFiltrados() {
  return itemsDeSeccion(state.seccion).filter((it) => {
    const okCat =
      state.seccion !== "todo" || state.categoria === "Todas" || it.categoria === state.categoria;
    const compTxt = Array.isArray(it.componentes) ? it.componentes.join(" ") : "";
    const txt = (it.nombre + " " + (it.modelo || "") + " " + it.categoria + " " +
      (it.sala || "") + " " + compTxt).toLowerCase();
    const okBusq = !state.busqueda || txt.includes(state.busqueda);
    return okCat && okBusq;
  });
}

function precioARS(it) {
  return Math.round(it.precioUSD * state.dolar);
}

function render() {
  const grid = $("#grid");
  let lista = itemsFiltrados();
  if (state.orden === "precio-asc") lista = lista.slice().sort((a, b) => precioARS(a) - precioARS(b));
  else if (state.orden === "precio-desc") lista = lista.slice().sort((a, b) => precioARS(b) - precioARS(a));
  grid.innerHTML = "";
  actualizarBotonFiltro();

  const sust = state.seccion === "combos" ? "combo" : "objeto";
  $("#vacio").hidden = lista.length > 0;
  $("#contador").textContent =
    lista.length === 0 ? "" :
    `${lista.length} ${sust}${lista.length === 1 ? "" : "s"}` +
    (state.seccion === "descuentos" ? " en descuento" : state.seccion === "combos" ? "" : " en venta") +
    (state.seccion === "todo" && state.categoria !== "Todas" ? ` · ${state.categoria}` : "");

  const tpl = $("#tpl-card");
  lista.forEach((it) => {
    const node = tpl.content.cloneNode(true);
    const ars = precioARS(it);

    if (esCombo(it)) node.querySelector(".card").classList.add("card--combo");
    node.querySelector("[data-cat]").textContent = it.categoria;
    node.querySelector("[data-nombre]").textContent = it.nombre;
    node.querySelector("[data-modelo]").textContent = it.modelo && it.modelo !== "—" ? it.modelo : "";

    const salaEl = node.querySelector("[data-sala]");
    if (it.sala) salaEl.textContent = it.sala; else salaEl.remove();

    // Componentes (combos): lista de lo que incluye.
    const compEl = node.querySelector("[data-componentes]");
    if (Array.isArray(it.componentes) && it.componentes.length) {
      compEl.hidden = false;
      it.componentes.forEach((c) => {
        const li = document.createElement("li");
        li.textContent = c;
        compEl.appendChild(li);
      });
    } else {
      compEl.remove();
    }

    const coment = node.querySelector("[data-coment]");
    if (it.comentario) coment.textContent = it.comentario; else coment.remove();

    const retiroEl = node.querySelector("[data-retiro]");
    if (state.config.retiro) retiroEl.textContent = "🔑 " + state.config.retiro;
    else retiroEl.remove();

    node.querySelector("[data-precio-ars]").textContent = fmtARS(ars);
    node.querySelector("[data-precio-usd]").textContent = "≈ " + fmtUSD(it.precioUSD);

    // Precio de lista tachado (descuentos y combos con ahorro).
    const listaEl = node.querySelector("[data-precio-lista]");
    if (esDescuento(it)) {
      listaEl.hidden = false;
      listaEl.textContent = fmtARS(Math.round(it.precioListaUSD * state.dolar));
    } else {
      listaEl.remove();
    }

    const unidadEl = node.querySelector("[data-precio-unidad]");
    if (it.unidades > 1) unidadEl.textContent = `c/u · ${it.unidades} disponibles`;
    else if (esDescuento(it)) unidadEl.textContent = `Ahorrás ${pctDescuento(it)}%`;
    else unidadEl.remove();

    // Galería: foto principal + acceso al lightbox al clickear.
    const media = node.querySelector("[data-media]");
    const badge = node.querySelector("[data-badge]");
    const countEl = node.querySelector("[data-media-count]");
    const fotos = Array.isArray(it.fotos) && it.fotos.length ? it.fotos : (it.foto ? [it.foto] : []);
    if (fotos.length) {
      const img = document.createElement("img");
      img.src = encImg(fotos[0]);
      img.alt = it.nombre;
      img.loading = "lazy";
      const ph = media.querySelector(".card__media-ph");
      if (ph) ph.replaceWith(img); else media.insertBefore(img, media.firstChild);
      media.classList.add("is-clickable");
      media.setAttribute("role", "button");
      media.tabIndex = 0;
      const abrir = () => abrirLightbox(it, fotos);
      media.addEventListener("click", abrir);
      media.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); }
      });
      if (fotos.length > 1) { countEl.hidden = false; countEl.textContent = `📷 ${fotos.length}`; }
      else countEl.remove();
    } else {
      countEl.remove();
    }
    if (esCombo(it)) {
      badge.textContent = "COMBO";
      badge.className = "card__badge is-combo";
      badge.hidden = false;
    } else if (esDescuento(it)) {
      badge.textContent = `-${pctDescuento(it)}%`;
      badge.className = "card__badge is-desc";
      badge.hidden = false;
    } else {
      badge.remove();
    }

    // Oferta negociable: arranca en el precio publicado. Si el usuario aún no la
    // tocó, sigue al precio publicado (que puede cambiar al actualizarse el dólar).
    if (state.ofertas[it.id] == null || !state.ofertaTocada[it.id]) {
      state.ofertas[it.id] = ars;
    }
    const paso = pasoOferta(ars);
    const wppLabel = node.querySelector("[data-wpp-label]");
    const a = node.querySelector("[data-wpp]");
    const input = node.querySelector("[data-of-input]");
    const hint = node.querySelector("[data-of-hint]");

    const sincronizar = () => {
      const oferta = state.ofertas[it.id];
      input.value = fmtNum(oferta);
      // Diferencia respecto del precio publicado.
      if (oferta === ars) {
        hint.textContent = "= precio publicado";
        hint.className = "card__oferta-hint";
      } else {
        const dif = Math.round(((oferta - ars) / ars) * 100);
        const signo = oferta > ars ? "+" : "−";
        hint.textContent = `${signo}${Math.abs(dif)}% vs. publicado`;
        hint.className = "card__oferta-hint " + (oferta > ars ? "is-up" : "is-down");
      }
      wppLabel.textContent = oferta === ars ? "Me interesa por WhatsApp" : "Ofertar por WhatsApp";
      a.href = linkWpp(it, ars, oferta);
    };

    const setOferta = (val) => {
      state.ofertas[it.id] = Math.max(0, Math.round(val));
      state.ofertaTocada[it.id] = true;
      sincronizar();
    };

    node.querySelector("[data-of-menos]").addEventListener("click", () =>
      setOferta(state.ofertas[it.id] - paso));
    node.querySelector("[data-of-mas]").addEventListener("click", () =>
      setOferta(state.ofertas[it.id] + paso));
    input.addEventListener("input", () => {
      const digits = input.value.replace(/[^\d]/g, "");
      state.ofertas[it.id] = digits ? Number(digits) : 0;
      state.ofertaTocada[it.id] = true;
      a.href = linkWpp(it, ars, state.ofertas[it.id]);
    });
    input.addEventListener("blur", sincronizar);

    sincronizar();

    grid.appendChild(node);
  });
}

function linkWpp(it, ars, oferta) {
  const num = (state.config.whatsappNumero || "").replace(/[^\d]/g, "");
  const ofreceDistinto = oferta != null && oferta > 0 && oferta !== ars;
  const partes = [
    `Hola! Me interesa este objeto de la venta de 3dar:`,
    ``,
    `• ${it.nombre}`,
    it.modelo && it.modelo !== "—" ? `• Modelo: ${it.modelo}` : null,
    `• Precio publicado: ${fmtARS(ars)}${it.unidades > 1 ? " c/u" : ""}`,
    ofreceDistinto ? `• Mi oferta: ${fmtARS(oferta)}${it.unidades > 1 ? " c/u" : ""}` : null,
    ``,
    ofreceDistinto ? `¿Lo podemos arreglar a ese precio?` : `¿Sigue disponible?`,
    state.config.retiro ? `(${state.config.retiro})` : null,
  ].filter(Boolean);
  const texto = encodeURIComponent(partes.join("\n"));
  return `https://wa.me/${num}?text=${texto}`;
}

/* ===================== Lightbox / galería de producto ===================== */
const lbState = { item: null, fotos: [], i: 0, zoom: false };

function abrirLightbox(it, fotos) {
  lbState.item = it;
  lbState.fotos = fotos;
  lbState.i = 0;
  lbState.zoom = false;
  const ars = precioARS(it);

  $("[data-lb-cat]").textContent = it.categoria;
  $("[data-lb-title]").textContent = it.nombre;
  const modeloEl = $("[data-lb-modelo]");
  modeloEl.textContent = it.modelo && it.modelo !== "—" ? it.modelo : "";
  modeloEl.hidden = !modeloEl.textContent;

  const compEl = $("[data-lb-componentes]");
  compEl.innerHTML = "";
  if (Array.isArray(it.componentes) && it.componentes.length) {
    compEl.hidden = false;
    it.componentes.forEach((c) => { const li = document.createElement("li"); li.textContent = c; compEl.appendChild(li); });
  } else compEl.hidden = true;

  const comentEl = $("[data-lb-coment]");
  comentEl.textContent = it.comentario || "";
  comentEl.hidden = !it.comentario;

  const retiroEl = $("[data-lb-retiro]");
  if (state.config.retiro) { retiroEl.textContent = "🔑 " + state.config.retiro; retiroEl.hidden = false; }
  else retiroEl.hidden = true;

  $("[data-lb-precio-ars]").textContent = fmtARS(ars);
  $("[data-lb-precio-usd]").textContent = "≈ " + fmtUSD(it.precioUSD);
  const listaEl = $("[data-lb-precio-lista]");
  if (esDescuento(it)) { listaEl.hidden = false; listaEl.textContent = fmtARS(Math.round(it.precioListaUSD * state.dolar)); }
  else listaEl.hidden = true;
  const uniEl = $("[data-lb-precio-unidad]");
  if (it.unidades > 1) { uniEl.hidden = false; uniEl.textContent = `c/u · ${it.unidades} disponibles`; }
  else if (esDescuento(it)) { uniEl.hidden = false; uniEl.textContent = `Ahorrás ${pctDescuento(it)}%`; }
  else uniEl.hidden = true;

  const oferta = state.ofertas[it.id];
  const a = $("[data-lb-wpp]");
  a.href = linkWpp(it, ars, oferta);
  $("[data-lb-wpp-label]").textContent = (oferta && oferta !== ars) ? "Ofertar por WhatsApp" : "Me interesa por WhatsApp";

  const thumbs = $("[data-lb-thumbs]");
  thumbs.innerHTML = "";
  thumbs.hidden = fotos.length <= 1;
  fotos.forEach((f, idx) => {
    const b = document.createElement("button");
    b.className = "lb__thumb";
    b.type = "button";
    const t = document.createElement("img");
    t.src = encImg(f); t.alt = ""; t.loading = "lazy";
    b.appendChild(t);
    b.addEventListener("click", () => lbShow(idx));
    thumbs.appendChild(b);
  });

  lbShow(0);
  $("#lightbox").hidden = false;
  document.body.classList.add("no-scroll");
}

function lbShow(i) {
  const n = lbState.fotos.length;
  if (!n) return;
  lbState.i = (i + n) % n;
  const img = $("[data-lb-img]");
  lbState.zoom = false;
  img.classList.remove("zoomed");
  img.style.transformOrigin = "center center";
  img.src = encImg(lbState.fotos[lbState.i]);
  img.alt = lbState.item ? lbState.item.nombre : "";
  $("[data-lb-counter]").textContent = `${lbState.i + 1} / ${n}`;
  Array.from($("[data-lb-thumbs]").children).forEach((t, idx) => t.classList.toggle("active", idx === lbState.i));
  const multi = n > 1 ? "" : "none";
  $("[data-lb-prev]").style.display = multi;
  $("[data-lb-next]").style.display = multi;
  $("[data-lb-counter]").style.display = multi;
}

function lbToggleZoom() {
  const img = $("[data-lb-img]");
  lbState.zoom = !lbState.zoom;
  img.classList.toggle("zoomed", lbState.zoom);
  if (!lbState.zoom) img.style.transformOrigin = "center center";
}

function cerrarLightbox() {
  $("#lightbox").hidden = true;
  document.body.classList.remove("no-scroll");
  lbState.zoom = false;
}

function bindLightbox() {
  document.querySelectorAll("[data-lb-close]").forEach((el) => el.addEventListener("click", cerrarLightbox));
  $("[data-lb-prev]").addEventListener("click", () => lbShow(lbState.i - 1));
  $("[data-lb-next]").addEventListener("click", () => lbShow(lbState.i + 1));
  $("[data-lb-zoom]").addEventListener("click", lbToggleZoom);

  const wrap = $("[data-lb-imgwrap]");
  wrap.addEventListener("click", lbToggleZoom);
  wrap.addEventListener("mousemove", (e) => {
    if (!lbState.zoom) return;
    const r = wrap.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    $("[data-lb-img]").style.transformOrigin = `${x}% ${y}%`;
  });

  document.addEventListener("keydown", (e) => {
    if ($("#lightbox").hidden) return;
    if (e.key === "Escape") cerrarLightbox();
    else if (e.key === "ArrowLeft") lbShow(lbState.i - 1);
    else if (e.key === "ArrowRight") lbShow(lbState.i + 1);
  });
}
