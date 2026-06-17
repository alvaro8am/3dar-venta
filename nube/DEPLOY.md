# 🚀 Publicar online: GitHub + Vercel + Supabase + Login Google

El código ya está listo y commiteado en git. Falta conectar tus cuentas.
Seguí los pasos **en este orden** (cada uno te da un dato que el siguiente necesita).

---

## Paso 0 · Poné tu Gmail de admin
Abrí `nube/db-schema.sql` y en la línea del `insert into public.admins`
cambiá `lucila@3dar.com` por **el Gmail con el que vas a entrar**.
(Si tu cuenta de Google es la de 3dar, dejá esa.)

---

## Paso 1 · Subir el repo a GitHub
1. Entrá a **github.com** → **New repository**.
   - Nombre: `3dar-venta` (o el que quieras). **Privado** está perfecto.
   - **NO** marques "Add README / .gitignore" (ya los tenemos).
2. En una terminal **parada en la carpeta `microsite`**, corré (cambiá `TU-USUARIO`):
   ```bash
   git remote add origin https://github.com/TU-USUARIO/3dar-venta.git
   git push -u origin main
   ```
   La primera vez se abre el navegador para loguearte en GitHub (Git Credential Manager). Aceptás y listo.
   > Tip: desde este chat podés correr comandos escribiendo `!` adelante, ej: `!git push -u origin main`

---

## Paso 2 · Crear el proyecto Supabase
Seguí `nube/SETUP-NUBE.md` (pasos 1 a 3):
- Crear proyecto → **SQL Editor** → pegar y correr `nube/db-schema.sql` (con tu Gmail del Paso 0).
- Anotá tu **Project Ref** (el `xxxx` de `https://xxxx.supabase.co`), el **Project URL** y la **anon key**.

---

## Paso 3 · Deploy en Vercel
1. Entrá a **vercel.com** → registrate **con GitHub**.
2. **Add New → Project** → importá el repo `3dar-venta`.
3. Configuración:
   - **Framework Preset: Other** (es un sitio estático, sin build).
   - Build Command: vacío · Output Directory: vacío (deja la raíz).
4. **Deploy**. Te queda una URL tipo **`https://3dar-venta.vercel.app`**. Anotala.
   - El sitio público está en esa URL; el **panel** en `…/admin`.

---

## Paso 4 · Configurar Login con Google
Necesitás un "OAuth Client" de Google y enchufarlo a Supabase.

### 4a. Google Cloud Console
1. Entrá a **console.cloud.google.com** → creá un proyecto (o usá uno).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo: **External** → Crear.
   - Completá nombre de app, tu email de soporte y de contacto. Guardá.
   - En **Usuarios de prueba**, agregá tu Gmail (si no publicás la app).
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - **Orígenes autorizados de JavaScript:**
     - `https://3dar-venta.vercel.app`  *(tu URL de Vercel)*
   - **URIs de redireccionamiento autorizados:**
     - `https://TU-PROJECT-REF.supabase.co/auth/v1/callback`  *(¡ojo, este es el de Supabase!)*
   - Crear → copiá **Client ID** y **Client Secret**.

### 4b. Supabase
1. **Authentication → Providers → Google** → activá → pegá **Client ID** y **Client Secret** → Save.
2. **Authentication → URL Configuration:**
   - **Site URL:** `https://3dar-venta.vercel.app`
   - **Redirect URLs:** agregá:
     - `https://3dar-venta.vercel.app/admin`
     - `https://3dar-venta.vercel.app/admin.html`

---

## Paso 5 · Conectar el sitio a la base
1. Abrí `supabase-config.js` y pegá tu **Project URL** y **anon key**.
2. Commit + push para que Vercel redeploye:
   ```bash
   git add supabase-config.js
   git commit -m "Conectar Supabase"
   git push
   ```

---

## Paso 6 · Migrar los productos actuales (una vez)
En la terminal, en `microsite` (cambiá los valores):
```bash
# PowerShell:
$env:SUPABASE_URL="https://TU-PROJECT-REF.supabase.co"
$env:SUPABASE_SERVICE_KEY="LA-SERVICE-ROLE-SECRET"   # Supabase → Project Settings → API
node nube/seed-nube.js
```
La `service_role` es secreta: se usa solo acá y no queda en ningún archivo.

---

## ✅ Listo
- **Sitio público:** `https://3dar-venta.vercel.app`
- **Panel admin:** `https://3dar-venta.vercel.app/admin` → **Entrar con Google**
- Cada cambio que hagas en el panel se ve al instante en el sitio.
- Para sumar otro administrador: en Supabase → SQL → `insert into public.admins (email) values ('otra@gmail.com');`

> Nota: el login con Google funciona en la URL de Vercel (o en localhost), **no** abriendo el archivo con doble clic (`file://`). Para administrar, entrá siempre por la URL de Vercel.
