# ☁️ Pasar el sitio a la nube (Supabase) — guía paso a paso

Tiempo estimado: ~10 minutos. No hace falta saber programar.

## 1. Crear el proyecto (gratis)
1. Entrá a **https://supabase.com** → **Start your project** → registrate (con Google o email).
2. **New project**:
   - Name: `3dar-venta` (o lo que quieras)
   - Database Password: poné una y **guardala** (la vas a necesitar una sola vez).
   - Region: **South America (São Paulo)** (la más cercana).
3. Esperá ~2 min a que diga "Project is ready".

## 2. Crear la base de datos
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abrí el archivo `nube/db-schema.sql`, copiá **todo** su contenido y pegalo.
3. Clic en **Run** (abajo a la derecha). Tiene que decir *Success*.

## 3. Crear tu usuario administrador
1. Menú izquierdo → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Poné tu **email** y una **contraseña** (con esto vas a entrar al panel `admin.html`).
3. Marcá **Auto Confirm User** (para no tener que confirmar por mail). **Create user.**

## 4. Pasarme los 2 datos (o cargarlos vos)
Menú izquierdo → **Project Settings** (el engranaje) → **API**. Copiá:
- **Project URL**
- **Project API keys → `anon` `public`**

Pegalos en el archivo `supabase-config.js` (raíz del microsite), entre las comillas:
```js
window.SUPABASE_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGci....(largo)",
};
```
> Estos 2 son públicos y seguros. **No** copies la `service_role`.

## 5. (Lo hago yo) Migrar tus 18 productos actuales
Para subir lo que ya tenés cargado (productos + fotos) hay un script `nube/seed-nube.js`.
Necesita **una** clave secreta de un solo uso:
- **Project Settings → API → `service_role` `secret`** (esta NO va en ningún archivo del sitio).
- Me la pasás por un canal privado o la ponés vos como variable de entorno y corrés el script
  (te dejo el comando exacto). Después de migrar, esa clave no se usa más.

---

## ¿Y el costo?
El plan **Free** de Supabase incluye 500 MB de base + 1 GB de fotos + 50.000 usuarios.
Para este catálogo sobra de lejos. $0 por mes.

## ¿Dónde queda publicado el sitio?
Una vez configurado, subimos la carpeta a **Netlify** o **Vercel** (gratis, arrastrar y soltar)
y te queda una dirección tipo `https://3dar-venta.netlify.app` que podés compartir.
El panel admin queda en `…/admin.html`.
