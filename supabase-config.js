/* ============================================================================
 *  Configuración de la nube (Supabase)
 *  Pegá acá los 2 datos de tu proyecto (Supabase → Project Settings → API):
 *    - Project URL         → SUPABASE_URL
 *    - Project API keys → "anon public"  → SUPABASE_ANON_KEY
 *  La "anon public" es segura para poner acá (es pública por diseño; lo que
 *  protege los datos son las reglas RLS del db-schema.sql). NO pongas la
 *  "service_role" en este archivo.
 *  ----------------------------------------------------------------------------
 *  Mientras estos valores estén vacíos, el sitio sigue funcionando con data.js
 *  (las carpetas), así no se rompe nada durante la transición.
 * ========================================================================== */
/* ⚠️ TEMPORALMENTE DESCONECTADO (12/08/2026)
 * El proyecto de Supabase estaba pausado y sólo tiene los 21 productos viejos.
 * Mientras se lo restaura y se le migran los 73 actuales, se deja vacío para
 * que el sitio siga sirviendo data.js y el catálogo no se vea incompleto.
 * Al terminar la migración se vuelven a poner estos dos valores:
 *   SUPABASE_URL:      https://uzulgidesbcttsvemmuj.supabase.co
 *   SUPABASE_ANON_KEY: (Project Settings → API → anon public)
 */
window.SUPABASE_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
