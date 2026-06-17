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
window.SUPABASE_CONFIG = {
  SUPABASE_URL: "",       // ej: https://abcdefgh.supabase.co
  SUPABASE_ANON_KEY: "",  // ej: eyJhbGciOi...
};
