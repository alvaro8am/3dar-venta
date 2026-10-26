/* ============================================================================
 *  Panel de administración — Supabase (auth + CRUD + storage de fotos)
 * ========================================================================== */
const $ = (s) => document.querySelector(s);
const show = (sel, on = true) => { const e = $(sel); if (e) e.hidden = !on; };

let sb = null;
let productos = [];
let editando = null;         // producto en edición (objeto con .fotos array)
let vendiendo = null;        // producto cuya venta se está registrando
let ordenVendidos = "monto"; // monto | medio | fecha
let dolarHoy = null;         // cotización del día, para convertir entre monedas
let ventaOrig = null;        // monto y moneda con los que se abrió el modal de venta

const CATS_DEFAULT = ["Tecnología", "Electrodomésticos", "Climatización", "Mobiliario", "Sillas y banquetas", "Combos"];
const MEDIOS_DEFAULT = ["WhatsApp", "MercadoLibre", "Facebook Marketplace", "En persona", "Interno 3dar", "Otro"];

document.addEventListener("DOMContentLoaded", arrancar);

async function arrancar() {
  const c = window.SUPABASE_CONFIG || {};
  if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY || !window.supabase) { show("#sin-config"); return; }
  sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);

  bindEventos();

  const { data: { session } } = await sb.auth.getSession();
  if (session) await checkAdminYEntrar(); else show("#login");
}

/* ---------------- Auth (email + contraseña) ---------------- */
async function checkAdminYEntrar() {
  const { data: ok, error } = await sb.rpc("es_admin");
  if (error || !ok) {
    const { data: { user } } = await sb.auth.getUser();
    $("#no-auth-msg").textContent =
      (user ? user.email : "Tu cuenta") + " no está en la lista de administradores. Pedí que te agreguen, o entrá con otra cuenta.";
    show("#login", false); show("#app", false); show("#no-auth");
    return;
  }
  show("#no-auth", false);
  entrarApp();
}

/* Traduce los errores de Supabase a algo que se entienda. */
function mensajeDeError(msg) {
  const m = String(msg || "");
  if (/Invalid login credentials/i.test(m)) return "Email o contraseña incorrectos.";
  if (/Email not confirmed/i.test(m)) return "El usuario existe pero no está confirmado. En Supabase → Authentication → Users, confirmalo.";
  if (/Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED/i.test(m))
    return "No se pudo conectar con el servidor. Puede que el proyecto de Supabase no exista o esté pausado, o que supabase-config.js tenga la URL mal.";
  if (/rate limit|Too many/i.test(m)) return "Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.";
  return m;
}

function bindEventos() {
  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#login-error");
    const btn = $("#btn-entrar");
    err.hidden = true;
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = "Entrando…";
    try {
      const { error } = await sb.auth.signInWithPassword({
        email: $("#login-email").value.trim(),
        password: $("#login-pass").value,
      });
      if (error) {
        err.textContent = mensajeDeError(error.message);
        err.hidden = false;
        return;
      }
      $("#login-pass").value = "";
      await checkAdminYEntrar();
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  });
  $("#btn-salir").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
  $("#btn-salir-noauth").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
  $("#btn-nuevo").addEventListener("click", () => abrirProd(null));
  $("#btn-config").addEventListener("click", abrirConfig);

  // modal producto
  document.querySelectorAll("[data-cerrar-prod]").forEach((el) => el.addEventListener("click", () => show("#modal-prod", false)));
  document.querySelectorAll("[data-cerrar-config]").forEach((el) => el.addEventListener("click", () => show("#modal-config", false)));

  // modal venta
  document.querySelectorAll("[data-cerrar-venta]").forEach((el) => el.addEventListener("click", () => show("#modal-venta", false)));
  $("#btn-guardar-venta").addEventListener("click", guardarVenta);
  $("#btn-desvender").addEventListener("click", desvender);

  $("#f-combo").addEventListener("change", (e) => show("#wrap-componentes", e.target.checked));

  // moneda del precio: al cambiarla se convierte lo que ya esté escrito
  $("#f-moneda").addEventListener("change", (e) => convertirCamposProd(e.target.value));
  ["#f-precio", "#f-lista"].forEach((s) => $(s).addEventListener("input", pintarConvProd));

  // moneda de la venta: idem
  $("#v-moneda").addEventListener("change", (e) => convertirCampoVenta(e.target.value));
  ["#v-precio", "#v-dolar"].forEach((s) => $(s).addEventListener("input", pintarConvVenta));
  $("#btn-guardar").addEventListener("click", guardarProd);
  $("#btn-borrar").addEventListener("click", borrarProd);
  $("#btn-guardar-config").addEventListener("click", guardarConfig);

  // fotos: input + drag&drop
  $("#f-fotos-input").addEventListener("change", (e) => subirFotos(e.target.files));
  const drop = $("#fotos-drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) subirFotos(e.dataTransfer.files); });
}

async function entrarApp() {
  show("#login", false);
  show("#app");
  const { data: { user } } = await sb.auth.getUser();
  $("#adm-sub").textContent = user ? ("Sesión: " + user.email) : "";
  await Promise.all([cargar(), cargarDolar()]);
  render(); // re-pintar los equivalentes en pesos ya con la cotización
}

/* La misma cotización que usa el sitio: dólar blue en vivo, y si no hay red,
 * el valor de respaldo que está cargado en la config. */
async function cargarDolar() {
  let fallback = 1300;
  let api = "https://dolarapi.com/v1/dolares/blue";
  try {
    const { data } = await sb.from("config").select("dolar_api, dolar_fallback").eq("id", 1).maybeSingle();
    if (data) {
      fallback = Number(data.dolar_fallback) || fallback;
      api = data.dolar_api || api;
    }
  } catch (e) { /* si falla, quedan los valores de arriba */ }
  try {
    const res = await fetch(api, { cache: "no-store" });
    const json = await res.json();
    const v = Number(json.venta || json.promedio || json.compra);
    dolarHoy = v && !isNaN(v) ? v : fallback;
  } catch (e) {
    dolarHoy = fallback;
  }
}

/* ---------------- Cargar / render lista ---------------- */
async function cargar() {
  const { data, error } = await sb.from("productos").select("*").order("orden", { ascending: true });
  if (error) { toast("Error cargando: " + error.message, "err"); return; }
  productos = data || [];
  rellenarCats();
  rellenarMedios();
  render();
}

function rellenarCats() {
  const cats = new Set(CATS_DEFAULT);
  productos.forEach((p) => p.categoria && cats.add(p.categoria));
  $("#cats").innerHTML = Array.from(cats).map((c) => `<option value="${c}">`).join("");
}

/* Los medios sugeridos: los de siempre + los que ya se hayan usado. */
function rellenarMedios() {
  const medios = new Set(MEDIOS_DEFAULT);
  productos.forEach((p) => p.medio_venta && medios.add(p.medio_venta));
  $("#medios").innerHTML = Array.from(medios).map((m) => `<option value="${escapeHtml(m)}">`).join("");
}

function render() {
  const cont = $("#lista");
  cont.innerHTML = "";
  if (!productos.length) { cont.innerHTML = `<p class="muted">No hay productos todavía. Tocá “+ Nuevo producto”.</p>`; return; }

  const enVenta = productos.filter((p) => !p.vendido);
  const vendidos = productos.filter((p) => p.vendido);

  cont.appendChild(encabezadoSeccion(`En venta (${enVenta.length})`));
  if (!enVenta.length) cont.appendChild(nota("Todo vendido 🎉"));
  enVenta.forEach((p) => cont.appendChild(filaProducto(p)));

  if (vendidos.length) renderVendidos(cont, vendidos);
}

function renderVendidos(cont, vendidos) {
  const total = vendidos.reduce((s, p) => s + montoVenta(p), 0);

  const head = encabezadoSeccion(`Vendidos (${vendidos.length})`);
  head.insertAdjacentHTML("beforeend",
    `<span class="adm-sec__total">Total: ${fmtUSD(total)}${dolarHoy ? ` · hoy ≈ ${fmtARS(total * dolarHoy)}` : ""}</span>`);
  cont.appendChild(head);

  // Desglose: cuánto entró por cada medio, de mayor a menor.
  const porMedio = new Map();
  vendidos.forEach((p) => {
    const m = p.medio_venta || "Sin medio";
    porMedio.set(m, (porMedio.get(m) || 0) + montoVenta(p));
  });
  const resumen = document.createElement("div");
  resumen.className = "adm-resumen";
  resumen.innerHTML = Array.from(porMedio.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([m, v]) => `<span class="adm-resumen__item"><b>${escapeHtml(m)}</b> ${fmtUSD(v)}</span>`)
    .join("");
  cont.appendChild(resumen);

  // Controles de orden.
  const ord = document.createElement("div");
  ord.className = "adm-orden";
  ord.innerHTML = "<span>Ordenar por:</span>" +
    [["monto", "monto"], ["medio", "medio"], ["fecha", "fecha"]]
      .map(([k, t]) => `<button class="adm-orden__btn${ordenVendidos === k ? " on" : ""}" data-orden="${k}">${t}</button>`)
      .join("");
  ord.querySelectorAll("[data-orden]").forEach((b) =>
    b.addEventListener("click", () => { ordenVendidos = b.dataset.orden; render(); }));
  cont.appendChild(ord);

  ordenarVendidos(vendidos).forEach((p) => cont.appendChild(filaProducto(p)));
}

function ordenarVendidos(arr) {
  const a = [...arr];
  if (ordenVendidos === "medio")
    return a.sort((x, y) =>
      (x.medio_venta || "zzz").localeCompare(y.medio_venta || "zzz", "es") || montoVenta(y) - montoVenta(x));
  if (ordenVendidos === "fecha")  // más reciente primero
    return a.sort((x, y) => String(y.fecha_venta || "").localeCompare(String(x.fecha_venta || "")));
  return a.sort((x, y) => montoVenta(y) - montoVenta(x));
}

function filaProducto(p) {
  const fotos = Array.isArray(p.fotos) ? p.fotos : [];
  const row = document.createElement("div");
  row.className = "adm-row" + (p.vendido ? " adm-row__sold" : p.publicado ? "" : " adm-row__off");

  const lista = monedaDe(p) === "ARS" ? p.precio_lista_ars : p.precio_lista_usd;
  const meta = p.vendido
    ? `${escapeHtml(p.medio_venta || "sin medio")}${p.fecha_venta ? " · " + fmtFecha(p.fecha_venta) : ""}
       ${precioDe(p) ? `· pedía ${fmtPrecioProd(p)}` : ""}
       ${p.nota_venta ? "· " + escapeHtml(p.nota_venta) : ""}`
    : `${escapeHtml(p.categoria || "")} · ${fmtPrecioProd(p)}${monedaDe(p) === "ARS" ? " fijo" : ""}
       ${lista ? `· lista ${monedaDe(p) === "ARS" ? fmtARS(lista) : fmtUSD(lista)}` : ""} · ${fotos.length} foto(s)`;

  row.innerHTML = `
    <img class="adm-row__thumb" src="${fotos[0] || ""}" alt="" />
    <div class="adm-row__main">
      <div class="adm-row__nombre">${escapeHtml(p.nombre || "(sin nombre)")}
        ${p.tipo === "combo" ? '<span class="adm-row__tag">combo</span>' : ""}</div>
      <div class="adm-row__meta">${meta}</div>
    </div>
    ${p.vendido
      ? `<span class="adm-row__monto">${fmtVenta(p)}${
            ventaMoneda(p) === "ARS" ? `<small>≈ ${fmtUSD(montoVenta(p))}</small>` : ""}</span>
         <span class="adm-row__pill sold">Vendido</span>
         <button class="btn btn-ghost btn-sm" data-act="venta">Editar venta</button>`
      : `<span class="adm-row__pill ${p.publicado ? "on" : "off"}">${p.publicado ? "Publicado" : "Oculto"}</span>
         <button class="btn btn-ghost btn-sm" data-act="venta">Vendido</button>`}
    <button class="btn btn-ghost btn-sm" data-act="editar">Editar</button>`;

  row.querySelector('[data-act="venta"]').addEventListener("click", () => abrirVenta(p));
  row.querySelector('[data-act="editar"]').addEventListener("click", () => abrirProd(p));
  return row;
}

function encabezadoSeccion(titulo) {
  const h = document.createElement("div");
  h.className = "adm-sec";
  h.innerHTML = `<h2 class="adm-sec__titulo">${escapeHtml(titulo)}</h2>`;
  return h;
}

function nota(txt) {
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = txt;
  return p;
}

/* ---------------- Modal producto ---------------- */
function abrirProd(p) {
  editando = p
    ? { ...p, fotos: Array.isArray(p.fotos) ? [...p.fotos] : [] }
    : { id: crypto.randomUUID(), nombre: "", categoria: "", modelo: "", moneda: "USD", precio_usd: 0,
        precio_ars: null, precio_lista_ars: null,
        precio_lista_usd: null, precio_nuevo_ars: null, link_nuevo: "", unidades: 1, orden: 100,
        tipo: null, componentes: [], comentario: "", publicado: true, fotos: [], _nuevo: true };

  $("#prod-modal-titulo").textContent = p ? "Editar producto" : "Nuevo producto";
  $("#f-nombre").value = editando.nombre || "";
  $("#f-categoria").value = editando.categoria || "";
  $("#f-modelo").value = editando.modelo || "";
  const mon = monedaDe(editando);
  $("#f-moneda").value = mon;
  $("#f-precio").value = (mon === "ARS" ? editando.precio_ars : editando.precio_usd) ?? (mon === "ARS" ? "" : 0);
  $("#f-lista").value = (mon === "ARS" ? editando.precio_lista_ars : editando.precio_lista_usd) ?? "";
  // Se recuerdan los valores tal como estaban para poder restaurarlos si se
  // vuelve a la moneda original: así ir y venir no corroe el precio.
  editando._orig = { moneda: mon, precio: $("#f-precio").value, lista: $("#f-lista").value };
  pintarMonedaProd();
  $("#f-nuevo").value = editando.precio_nuevo_ars ?? "";
  $("#f-link-nuevo").value = editando.link_nuevo || "";
  $("#f-unidades").value = editando.unidades ?? 1;
  $("#f-orden").value = editando.orden ?? 100;
  $("#f-combo").checked = editando.tipo === "combo";
  $("#f-publicado").checked = editando.publicado !== false;
  $("#f-componentes").value = (editando.componentes || []).join("\n");
  $("#f-comentario").value = editando.comentario || "";
  show("#wrap-componentes", editando.tipo === "combo");
  $("#btn-borrar").hidden = !p;
  $("#upload-status").hidden = true;
  renderFotos();
  show("#modal-prod");
}

function renderFotos() {
  const grid = $("#fotos-grid");
  grid.innerHTML = "";
  editando.fotos.forEach((url, i) => {
    const div = document.createElement("div");
    div.className = "foto-item" + (i === 0 ? " cover" : "");
    div.innerHTML = `
      <img src="${url}" alt="" />
      ${i === 0 ? '<span class="foto-item__cover-tag">portada</span>' : ""}
      <div class="foto-item__btns">
        <button title="Mover izquierda" data-mv="-1">◀</button>
        <button title="Mover derecha" data-mv="1">▶</button>
        <button title="Borrar" data-del="1">✕</button>
      </div>`;
    div.querySelector('[data-mv="-1"]').addEventListener("click", () => moverFoto(i, -1));
    div.querySelector('[data-mv="1"]').addEventListener("click", () => moverFoto(i, 1));
    div.querySelector('[data-del="1"]').addEventListener("click", () => borrarFoto(i));
    grid.appendChild(div);
  });
}

function moverFoto(i, d) {
  const j = i + d;
  if (j < 0 || j >= editando.fotos.length) return;
  const f = editando.fotos;
  [f[i], f[j]] = [f[j], f[i]];
  renderFotos();
}

async function borrarFoto(i) {
  const url = editando.fotos[i];
  editando.fotos.splice(i, 1);
  renderFotos();
  // best-effort: borrar de storage
  const path = pathDeUrl(url);
  if (path) { try { await sb.storage.from("fotos").remove([path]); } catch (e) { /* ignorar */ } }
}

async function subirFotos(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  const status = $("#upload-status");
  status.hidden = false;
  let n = 0;
  for (const file of files) {
    n++;
    status.textContent = `Subiendo ${n}/${files.length}…`;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "foto";
    const path = `${editando.id}/${Date.now()}-${base}.${ext}`;
    const { error } = await sb.storage.from("fotos").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast("Error subiendo " + file.name + ": " + error.message, "err"); continue; }
    const { data } = sb.storage.from("fotos").getPublicUrl(path);
    editando.fotos.push(data.publicUrl);
    renderFotos();
  }
  status.textContent = "Listo ✓";
  setTimeout(() => { status.hidden = true; }, 1500);
  $("#f-fotos-input").value = "";
}

async function guardarProd() {
  const nombre = $("#f-nombre").value.trim();
  if (!nombre) { toast("Poné un nombre.", "err"); return; }
  const combo = $("#f-combo").checked;
  const mon = $("#f-moneda").value === "ARS" ? "ARS" : "USD";
  const precio = Number($("#f-precio").value) || 0;
  const lista = $("#f-lista").value !== "" ? Number($("#f-lista").value) : null;
  // Con el precio fijado en pesos igual se guarda el equivalente en dólares:
  // no lo usa el sitio, pero mantiene útil el respaldo de data.js.
  const usdEquiv = dolarHoy ? Math.round(precio / dolarHoy) : (Number(editando.precio_usd) || 0);
  const fila = {
    id: editando.id,
    nombre,
    categoria: $("#f-categoria").value.trim() || "Otros",
    modelo: $("#f-modelo").value.trim(),
    moneda: mon,
    precio_usd: mon === "USD" ? precio : usdEquiv,
    precio_ars: mon === "ARS" ? precio : null,
    precio_lista_ars: mon === "ARS" ? lista : null,
    precio_lista_usd: mon === "USD" ? lista : null,
    precio_nuevo_ars: $("#f-nuevo").value !== "" ? Number($("#f-nuevo").value) : null,
    link_nuevo: $("#f-link-nuevo").value.trim(),
    unidades: Number($("#f-unidades").value) || 1,
    orden: Number($("#f-orden").value) || 100,
    tipo: combo ? "combo" : null,
    componentes: combo ? $("#f-componentes").value.split("\n").map((s) => s.trim()).filter(Boolean) : [],
    comentario: $("#f-comentario").value.trim(),
    publicado: $("#f-publicado").checked,
    fotos: editando.fotos,
  };
  $("#btn-guardar").disabled = true;
  const { error } = await sb.from("productos").upsert(fila);
  $("#btn-guardar").disabled = false;
  if (error) { toast("Error guardando: " + error.message, "err"); return; }
  show("#modal-prod", false);
  toast("Guardado ✓", "ok");
  await cargar();
}

async function borrarProd() {
  if (!editando || editando._nuevo) { show("#modal-prod", false); return; }
  if (!confirm(`¿Borrar “${editando.nombre}”? Esta acción no se puede deshacer.`)) return;
  const { error } = await sb.from("productos").delete().eq("id", editando.id);
  if (error) { toast("Error: " + error.message, "err"); return; }
  // best-effort: borrar fotos del storage
  const paths = (editando.fotos || []).map(pathDeUrl).filter(Boolean);
  if (paths.length) { try { await sb.storage.from("fotos").remove(paths); } catch (e) { /* ignorar */ } }
  show("#modal-prod", false);
  toast("Producto borrado", "ok");
  await cargar();
}

/* ---------------- Registrar / editar una venta ---------------- */
function abrirVenta(p) {
  vendiendo = p;
  const ya = !!p.vendido;
  $("#venta-modal-titulo").textContent = ya ? "Editar venta" : "Registrar venta";
  $("#venta-prod").textContent = (p.nombre || "(sin nombre)") + (p.modelo ? " · " + p.modelo : "");

  // La cotización de esa venta si ya estaba registrada; si no, la del día.
  $("#v-dolar").value = (ya && p.dolar_venta) ? Math.round(p.dolar_venta)
    : (dolarHoy ? Math.round(dolarHoy) : "");

  if (ya) {
    $("#v-moneda").value = ventaMoneda(p);
    $("#v-precio").value = ventaMonto(p) ?? "";
  } else {
    // Arranca en pesos, que es como se cobra casi siempre, con el precio del
    // producto ya pasado a esa moneda.
    $("#v-moneda").value = "ARS";
    $("#v-precio").value = sugerirMonto(p, "ARS");
  }
  $("#v-medio").value = p.medio_venta || "";
  $("#v-fecha").value = p.fecha_venta || hoyISO();
  $("#v-nota").value = p.nota_venta || "";
  $("#btn-desvender").hidden = !ya;
  $("#btn-guardar-venta").textContent = ya ? "Guardar cambios" : "Guardar venta";
  ventaOrig = { moneda: $("#v-moneda").value, monto: $("#v-precio").value };
  show("#venta-hint", !ya);
  pintarConvVenta();
  show("#modal-venta");
}

async function guardarVenta() {
  if (!vendiendo) return;
  const precio = $("#v-precio").value;
  const mon = $("#v-moneda").value === "ARS" ? "ARS" : "USD";
  const medio = normalizarMedio($("#v-medio").value);
  if (precio === "") { toast("Poné a cuánto se vendió.", "err"); return; }
  if (!medio) { toast("Poné por qué medio se vendió.", "err"); return; }

  // Lo cobrado se guarda tal cual, y además normalizado a dólares: es lo que
  // hace que los totales se puedan sumar aunque se cobre en monedas distintas.
  const monto = Number(precio) || 0;
  const dolar = mon === "ARS" ? (Number($("#v-dolar").value) || dolarHoy) : null;
  if (mon === "ARS" && !dolar) {
    toast("Falta la cotización para pasar el monto a dólares.", "err");
    return;
  }
  const usd = mon === "ARS" ? Math.round(monto / dolar) : monto;

  const btn = $("#btn-guardar-venta");
  btn.disabled = true;
  const { error } = await sb.from("productos").update({
    vendido: true,
    precio_venta_monto: monto,
    precio_venta_moneda: mon,
    dolar_venta: dolar,
    precio_venta_usd: usd,
    medio_venta: medio,
    fecha_venta: $("#v-fecha").value || hoyISO(),
    nota_venta: $("#v-nota").value.trim(),
  }).eq("id", vendiendo.id);
  btn.disabled = false;

  if (error) { toast(mensajeDeErrorVenta(error.message), "err"); return; }
  show("#modal-venta", false);
  toast("Venta registrada ✓", "ok");
  await cargar();
}

async function desvender() {
  if (!vendiendo) return;
  if (!confirm(`¿Volver “${vendiendo.nombre}” a en venta? Se borra el registro de la venta y, si está publicado, vuelve al catálogo.`)) return;
  const { error } = await sb.from("productos").update({
    vendido: false, precio_venta_usd: null, precio_venta_monto: null, precio_venta_moneda: "USD",
    dolar_venta: null, medio_venta: null, fecha_venta: null, nota_venta: "",
  }).eq("id", vendiendo.id);
  if (error) { toast(mensajeDeErrorVenta(error.message), "err"); return; }
  show("#modal-venta", false);
  toast("Volvió a en venta", "ok");
  await cargar();
}

/* Si falta correr la migración, el error de Supabase es incomprensible. */
function mensajeDeErrorVenta(msg) {
  const m = String(msg || "");
  if (/schema cache|does not exist|vendido|precio_venta_usd/i.test(m))
    return "La base todavía no tiene las columnas de venta. Hay que correr nube/ventas.sql en el SQL Editor de Supabase.";
  return mensajeDeError(m);
}

/* ---------------- Config del sitio ---------------- */
async function abrirConfig() {
  const { data } = await sb.from("config").select("*").eq("id", 1).maybeSingle();
  const c = data || {};
  $("#c-titulo").value = c.titulo || "";
  $("#c-subtitulo").value = c.subtitulo || "";
  $("#c-whatsapp").value = c.whatsapp_numero || "";
  $("#c-dolar").value = c.dolar_fallback ?? 1300;
  $("#c-retiro").value = c.retiro || "";
  $("#c-nota").value = c.nota_precios || "";
  show("#modal-config");
}

async function guardarConfig() {
  const fila = {
    id: 1,
    titulo: $("#c-titulo").value.trim(),
    subtitulo: $("#c-subtitulo").value.trim(),
    whatsapp_numero: $("#c-whatsapp").value.replace(/[^\d]/g, ""),
    dolar_fallback: Number($("#c-dolar").value) || 1300,
    retiro: $("#c-retiro").value.trim(),
    nota_precios: $("#c-nota").value.trim(),
  };
  const { error } = await sb.from("config").upsert(fila);
  if (error) { toast("Error: " + error.message, "err"); return; }
  show("#modal-config", false);
  toast("Configuración guardada ✓", "ok");
}

/* ---------------- helpers ---------------- */
function pathDeUrl(url) {
  const m = String(url).split("/fotos/")[1];
  return m ? decodeURIComponent(m) : null;
}
function montoVenta(p) { return Number(p.precio_venta_usd) || 0; }
function fmtUSD(n) { return "USD " + Math.round(n).toLocaleString("es-AR"); }
function fmtARS(n) { return "$ " + Math.round(n).toLocaleString("es-AR"); }

/* ---------------- Monedas ----------------
 * Un producto tiene el precio fijado en USD (se publica convertido al dólar
 * del día) o en ARS (precio fijo en pesos). La venta, aparte, se cobra en la
 * moneda que sea: se guarda tal cual y también pasada a dólares, que es lo
 * que permite sumar los totales.
 */
function monedaDe(p) { return p.moneda === "ARS" ? "ARS" : "USD"; }
function precioDe(p) { return monedaDe(p) === "ARS" ? (Number(p.precio_ars) || 0) : (Number(p.precio_usd) || 0); }
function fmtPrecioProd(p) { return monedaDe(p) === "ARS" ? fmtARS(precioDe(p)) : fmtUSD(precioDe(p)); }

function ventaMoneda(p) { return p.precio_venta_moneda === "ARS" ? "ARS" : "USD"; }
function ventaMonto(p) { return p.precio_venta_monto != null ? Number(p.precio_venta_monto) : montoVenta(p); }
function fmtVenta(p) { return ventaMoneda(p) === "ARS" ? fmtARS(ventaMonto(p)) : fmtUSD(ventaMonto(p)); }

// Monto sugerido al abrir una venta: el precio del producto, en la moneda pedida.
function sugerirMonto(p, moneda) {
  const base = precioDe(p);
  if (!base) return "";
  if (monedaDe(p) === moneda) return base;
  const d = Number($("#v-dolar").value) || dolarHoy;
  if (!d) return "";
  return moneda === "ARS" ? Math.round(base * d) : Math.round(base / d);
}

function pintarMonedaProd() {
  const mon = $("#f-moneda").value === "ARS" ? "ARS" : "USD";
  document.querySelectorAll("[data-moneda-precio]").forEach((e) => { e.textContent = `(${mon})`; });
  pintarConvProd();
}

// Al cambiar la moneda se convierte lo ya escrito, para no retipear.
function convertirCamposProd(nueva) {
  const orig = editando && editando._orig;
  if (orig && orig.moneda === nueva) {
    $("#f-precio").value = orig.precio;
    $("#f-lista").value = orig.lista;
  } else if (dolarHoy) {
    ["#f-precio", "#f-lista"].forEach((s) => {
      const v = Number($(s).value);
      if ($(s).value !== "" && v) $(s).value = nueva === "ARS" ? Math.round(v * dolarHoy) : Math.round(v / dolarHoy);
    });
  }
  pintarMonedaProd();
}

function pintarConvProd() {
  const mon = $("#f-moneda").value === "ARS" ? "ARS" : "USD";
  const hint = $("#f-conv");
  const v = Number($("#f-precio").value);
  if (!v || !dolarHoy) { hint.hidden = true; return; }
  hint.textContent = mon === "ARS"
    ? `Precio fijo en pesos: ${fmtARS(v)} (hoy ≈ ${fmtUSD(v / dolarHoy)}). No se mueve con el dólar.`
    : `${fmtUSD(v)} · hoy se publica como ${fmtARS(v * dolarHoy)}, y sigue la cotización.`;
  hint.hidden = false;
}

function convertirCampoVenta(nueva) {
  if (ventaOrig && ventaOrig.moneda === nueva) {
    $("#v-precio").value = ventaOrig.monto;  // volver sin arrastrar redondeos
  } else {
    const d = Number($("#v-dolar").value) || dolarHoy;
    const v = Number($("#v-precio").value);
    if (v && d) $("#v-precio").value = nueva === "ARS" ? Math.round(v * d) : Math.round(v / d);
  }
  pintarConvVenta();
}

function pintarConvVenta() {
  const esARS = $("#v-moneda").value === "ARS";
  show("#wrap-dolar-venta", esARS);
  const hint = $("#v-conv");
  const v = Number($("#v-precio").value);
  const d = Number($("#v-dolar").value) || dolarHoy;
  if (!esARS || !v || !d) { hint.hidden = true; return; }
  hint.textContent = `${fmtARS(v)} ≈ ${fmtUSD(v / d)} — es el valor que suma en el total.`;
  hint.hidden = false;
}

function fmtFecha(iso) {
  const [a, m, d] = String(iso).split("-");
  return d ? `${d}/${m}/${a}` : String(iso);
}
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/* Reusa la forma ya escrita de un medio ("whatsapp" → "WhatsApp") para que el
 * desglose por medio no se parta en variantes de la misma cosa. */
function normalizarMedio(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  const conocidos = new Set(MEDIOS_DEFAULT);
  productos.forEach((p) => p.medio_venta && conocidos.add(p.medio_venta));
  return Array.from(conocidos).find((m) => m.toLowerCase() === s.toLowerCase()) || s;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
let toastT;
function toast(msg, tipo) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast " + (tipo || "");
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 3200);
}
