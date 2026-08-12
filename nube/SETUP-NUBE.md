# ☁️ Revivir el panel (Supabase) — guía paso a paso

Tiempo estimado: ~15 minutos. No hace falta saber programar.

El panel entra con **email y contraseña**. No hace falta Google ni Google Cloud.

---

## ⚠️ Leé esto antes de empezar

El sitio decide de dónde saca el catálogo según `supabase-config.js`:

- **Vacío** → usa `data.js` (73 objetos). Es como está funcionando hoy.
- **Con datos** → usa la nube, e **ignora `data.js` por completo**.

Por eso **el paso 5 (configurar) va último**. Si lo hacés antes de migrar, el sitio
queda mostrando una base vacía. Respetá el orden y no pasa nada.

---

## 1. Crear el proyecto (gratis)

1. Entrá a **https://supabase.com** → **Start your project** → registrate.
2. **New project**:
   - Name: `3dar-venta`
   - Database Password: poné una y **guardala**.
   - Region: **South America (São Paulo)**.
3. Esperá ~2 min a que diga "Project is ready".

## 2. Crear la base de datos

1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abrí `nube/db-schema.sql`, copiá **todo** y pegalo.
3. Antes de ejecutar, revisá la lista de emails administradores (cerca del punto `2b`).
   Vienen `alvaro@3dar.com` y `lucila@3dar.com`. Dejá los que correspondan.
4. **Run**. Tiene que decir *Success*.

## 3. Crear tu usuario

1. Menú izquierdo → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: **el mismo que pusiste en la lista de admins del paso 2** (en minúscula, igual).
3. Poné una contraseña y **marcá "Auto Confirm User"**.
4. **Create user**.

> Si el email del usuario no coincide con el de la tabla `admins`, vas a poder loguearte
> pero el panel te va a decir "Cuenta no autorizada". Tienen que ser idénticos.

## 4. Migrar los 73 objetos

Esto sube el catálogo actual y las fotos a la nube. Necesita una clave secreta de un solo uso.

1. **Project Settings** (engranaje) → **API** → copiá el **Project URL** y la clave
   **`service_role` `secret`**.
2. Abrí PowerShell y pegá esto, reemplazando los dos valores:

```powershell
cd "D:\Documentos\VENTA 3DAR\microsite"
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_KEY="LA-SERVICE-ROLE-SECRET"
node nube/seed-nube.js
```

Va listando los 73 productos. Al final dice *Migración completa*.

> 🔒 La `service_role` es **secreta**: da acceso total a la base salteando todos los permisos.
> No la pegues en ningún archivo del sitio, no la subas a GitHub y no se la pases a nadie
> (tampoco al asistente). Se usa sólo para este comando y no se vuelve a necesitar.

## 5. Conectar el sitio (último paso)

1. **Project Settings** → **API**. Copiá el **Project URL** y la clave **`anon` `public`**
   (esta sí es pública y segura).
2. Pegalos en `supabase-config.js`, en la raíz del microsite:

```js
window.SUPABASE_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGci....(largo)",
};
```

3. Commit y push:

```powershell
cd "D:\Documentos\VENTA 3DAR\microsite"
git add supabase-config.js
git commit -m "chore: conectar el sitio al nuevo Supabase"
git push origin main
```

Vercel redeploya solo. Listo: el panel queda en
**https://microsite-ecru-eight.vercel.app/admin.html**

---

## Cómo verificar que salió bien

Entrá al sitio público y contá: tienen que seguir siendo **73 objetos**. Si ves menos
(o ninguno), la migración quedó incompleta — vaciá `supabase-config.js`, pusheá, y el
sitio vuelve a `data.js` mientras lo resolvés. Ese es tu botón de pánico.

## De acá en adelante

Con el panel andando, cargás fotos y editás precios desde el navegador, sin tocar código.

Ojo: los cambios que hagas por el panel **no se reflejan en `data.js`**. Ese archivo pasa a
ser el respaldo del estado al momento de migrar. Si algún día querés volver a `data.js`,
vas a tener que exportar de nuevo.

## ¿Y el costo?

Plan **Free**: 500 MB de base + 1 GB de fotos. Para este catálogo sobra. $0 por mes.

> ⚠️ Supabase **pausa los proyectos Free inactivos** (~1 semana sin uso). Un proyecto pausado
> se puede reactivar desde el dashboard. Lo que le pasó al anterior fue peor: se eliminó, y
> con él los productos. Por eso `productos_dump.json` está versionado en el repo.
