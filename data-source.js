/* ============================================================================
 *  Capa de datos del sitio público.
 *  Si supabase-config.js tiene URL+KEY → trae productos/config de la NUBE.
 *  Si no → usa window.SITE_DATA (data.js, las carpetas). Así nunca se rompe.
 * ========================================================================== */
function mapProducto(r) {
  const fotos = Array.isArray(r.fotos) ? r.fotos : [];
  return {
    id: r.id,
    nombre: r.nombre,
    modelo: r.modelo || "",
    categoria: r.categoria || "Otros",
    unidades: r.unidades || 1,
    precioUSD: Number(r.precio_usd) || 0,
    precioListaUSD: r.precio_lista_usd != null ? Number(r.precio_lista_usd) : undefined,
    precioNuevoARS: r.precio_nuevo_ars != null ? Number(r.precio_nuevo_ars) : undefined,
    linkNuevo: r.link_nuevo || "",
    comentario: r.comentario || "",
    tipo: r.tipo || undefined,
    componentes: Array.isArray(r.componentes) ? r.componentes : [],
    fotos,
    foto: fotos[0] || null,
  };
}

function mapConfig(c) {
  return {
    titulo: c.titulo,
    subtitulo: c.subtitulo,
    whatsappNumero: c.whatsapp_numero,
    retiro: c.retiro,
    dolarApi: c.dolar_api,
    dolarFallback: c.dolar_fallback,
    notaPrecios: c.nota_precios,
  };
}

function nubeConfigurada() {
  const c = window.SUPABASE_CONFIG || {};
  return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY && window.supabase);
}

window.obtenerDatos = async function () {
  if (nubeConfigurada()) {
    try {
      const c = window.SUPABASE_CONFIG;
      const sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
      const [prodRes, confRes] = await Promise.all([
        sb.from("productos").select("*").eq("publicado", true).order("orden", { ascending: true }),
        sb.from("config").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (prodRes.error) throw prodRes.error;
      const items = (prodRes.data || []).map(mapProducto);
      const config = confRes.data ? mapConfig(confRes.data) : {};
      return { config, items, fuente: "nube" };
    } catch (err) {
      console.error("No se pudo leer de la nube, uso data.js:", err.message || err);
    }
  }
  const local = window.SITE_DATA || { config: {}, items: [] };
  return { config: local.config || {}, items: local.items || [], fuente: "local" };
};
