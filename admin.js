/* ============================================================================
 *  Panel de administración — Supabase (auth + CRUD + storage de fotos)
 * ========================================================================== */
const $ = (s) => document.querySelector(s);
const show = (sel, on = true) => { const e = $(sel); if (e) e.hidden = !on; };

let sb = null;
let productos = [];
let editando = null; // producto en edición (objeto con .fotos array)

const CATS_DEFAULT = ["Tecnología", "Electrodomésticos", "Climatización", "Mobiliario", "Sillas y banquetas", "Combos"];

document.addEventListener("DOMContentLoaded", arrancar);

async function arrancar() {
  const c = window.SUPABASE_CONFIG || {};
  if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY || !window.supabase) { show("#sin-config"); return; }
  sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);

  bindEventos();

  const { data: { session } } = await sb.auth.getSession();
  if (session) await checkAdminYEntrar(); else show("#login");
}

/* ---------------- Auth (Google) ---------------- */
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

function bindEventos() {
  $("#btn-google").addEventListener("click", async () => {
    $("#login-error").hidden = true;
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) { $("#login-error").textContent = error.message; $("#login-error").hidden = false; }
  });
  $("#btn-salir").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
  $("#btn-salir-noauth").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
  $("#btn-nuevo").addEventListener("click", () => abrirProd(null));
  $("#btn-config").addEventListener("click", abrirConfig);

  // modal producto
  document.querySelectorAll("[data-cerrar-prod]").forEach((el) => el.addEventListener("click", () => show("#modal-prod", false)));
  document.querySelectorAll("[data-cerrar-config]").forEach((el) => el.addEventListener("click", () => show("#modal-config", false)));
  $("#f-combo").addEventListener("change", (e) => show("#wrap-componentes", e.target.checked));
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
  await cargar();
}

/* ---------------- Cargar / render lista ---------------- */
async function cargar() {
  const { data, error } = await sb.from("productos").select("*").order("orden", { ascending: true });
  if (error) { toast("Error cargando: " + error.message, "err"); return; }
  productos = data || [];
  rellenarCats();
  render();
}

function rellenarCats() {
  const cats = new Set(CATS_DEFAULT);
  productos.forEach((p) => p.categoria && cats.add(p.categoria));
  $("#cats").innerHTML = Array.from(cats).map((c) => `<option value="${c}">`).join("");
}

function render() {
  const cont = $("#lista");
  cont.innerHTML = "";
  if (!productos.length) { cont.innerHTML = `<p class="muted">No hay productos todavía. Tocá “+ Nuevo producto”.</p>`; return; }
  productos.forEach((p) => {
    const fotos = Array.isArray(p.fotos) ? p.fotos : [];
    const row = document.createElement("div");
    row.className = "adm-row" + (p.publicado ? "" : " adm-row__off");
    row.innerHTML = `
      <img class="adm-row__thumb" src="${fotos[0] || ""}" alt="" />
      <div class="adm-row__main">
        <div class="adm-row__nombre">${escapeHtml(p.nombre || "(sin nombre)")}
          ${p.tipo === "combo" ? '<span class="adm-row__tag">combo</span>' : ""}</div>
        <div class="adm-row__meta">${escapeHtml(p.categoria || "")} · USD ${p.precio_usd || 0}
          ${p.precio_lista_usd ? `· lista ${p.precio_lista_usd}` : ""} · ${fotos.length} foto(s)</div>
      </div>
      <span class="adm-row__pill ${p.publicado ? "on" : "off"}">${p.publicado ? "Publicado" : "Oculto"}</span>
      <button class="btn btn-ghost btn-sm">Editar</button>`;
    row.querySelector("button").addEventListener("click", () => abrirProd(p));
    cont.appendChild(row);
  });
}

/* ---------------- Modal producto ---------------- */
function abrirProd(p) {
  editando = p
    ? { ...p, fotos: Array.isArray(p.fotos) ? [...p.fotos] : [] }
    : { id: crypto.randomUUID(), nombre: "", categoria: "", modelo: "", precio_usd: 0,
        precio_lista_usd: null, precio_nuevo_ars: null, link_nuevo: "", unidades: 1, orden: 100,
        tipo: null, componentes: [], comentario: "", publicado: true, fotos: [], _nuevo: true };

  $("#prod-modal-titulo").textContent = p ? "Editar producto" : "Nuevo producto";
  $("#f-nombre").value = editando.nombre || "";
  $("#f-categoria").value = editando.categoria || "";
  $("#f-modelo").value = editando.modelo || "";
  $("#f-precio").value = editando.precio_usd ?? 0;
  $("#f-lista").value = editando.precio_lista_usd ?? "";
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
  const fila = {
    id: editando.id,
    nombre,
    categoria: $("#f-categoria").value.trim() || "Otros",
    modelo: $("#f-modelo").value.trim(),
    precio_usd: Number($("#f-precio").value) || 0,
    precio_lista_usd: $("#f-lista").value !== "" ? Number($("#f-lista").value) : null,
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
