# 3dar · Microsite de venta de equipamiento

Sitio estático para ofrecer a la venta el equipamiento de oficina de 3dar.
No necesita instalar nada: **abrí `index.html` con doble clic** y funciona.

> **Retiro:** todos los objetos se retiran por la baulera de **Av. Elcano y Fraga (CABA)**.
> Esto se configura en un solo lugar (`config.retiro` en `data.js`) y aparece en cada
> tarjeta y en el mensaje de WhatsApp.

## Qué hace
- Lista los objetos en venta (cargados en `data.js`, con fotos en `img/`).
- Muestra nombre, modelo, categoría y **precio sugerido en pesos (ARS)**.
- Los precios se guardan en **USD** y el sitio los convierte a pesos usando la
  **cotización del dólar blue en vivo** (vía dolarapi.com). Así el precio en pesos
  se actualiza solo según el dólar, sin tener que tocar nada.
- Cada objeto tiene un control para **ofertar un precio**: arranca en el precio
  publicado y con los botones **−/+** (o escribiendo) lo subís o bajás para negociar.
  Muestra el % de diferencia respecto del precio publicado.
- El botón **WhatsApp** abre un chat con un mensaje ya escrito citando el objeto, el
  precio publicado y, si ofertaste otro valor, **tu oferta**.
- Buscador + filtro por categoría.

### Secciones (pestañas arriba de todo)
- **Todo:** el catálogo completo con filtro por categoría.
- **🔥 Descuentos:** objetos rebajados. Se muestran con el precio de mercado
  **tachado**, el precio nuevo y un cartelito con el **% de descuento**.
- **📦 Combos:** paquetes de varios objetos a precio conjunto (banquetas x3,
  set de sillas, etc.), con la lista de lo que incluye.

Las pestañas que no tienen objetos se ocultan solas. Cada una muestra cuántos hay.

#### Cómo marcar un objeto en DESCUENTO
En `data.js`, agregale al objeto la línea `precioListaUSD` con el precio de
referencia de mercado (más alto que el de venta). El sitio calcula solo el % off:

```js
"precioUSD": 90,          // ← precio de venta (el que cobrás)
"precioListaUSD": 135,    // ← precio de mercado tachado. Sacá esta línea y deja de estar en oferta.
```

#### Cómo armar un COMBO
Copiá uno de los bloques con `"tipo": "combo"` (al final de `data.js`) y editalo:

```js
{
  "id": 104,                       // ← un id nuevo, único
  "tipo": "combo",
  "nombre": "Combo Oficina — escritorio + silla",
  "categoria": "Combos",
  "unidades": 1,
  "precioUSD": 150,                // ← precio del combo
  "precioListaUSD": 180,           // ← suma de los precios sueltos (para mostrar el ahorro). Opcional.
  "componentes": [                 // ← qué incluye (una línea por cosa)
    "1× Escritorio vintage George",
    "1× Banqueta industrial"
  ],
  "comentario": "Texto opcional.",
  "foto": "img/escritorio-george.jpg"
}
```

## ⚠️ Antes de compartirlo: 1 cosa
- **Revisá los precios.** Son **estimados de mercado usado a confirmar** (varios objetos
  no traían precio cargado). Ajustá `precioUSD` (y `precioListaUSD` en los descuentos) a gusto.

> El número de WhatsApp ya está configurado (`5491161995651`). Si cambia, editá `whatsappNumero` en `generar-data.js` y regenerá.

## 📂 Cómo funciona (carpetas → publicaciones)
Cada **carpeta dentro de `img/` es una publicación**:
- El **título** sale del nombre de la carpeta.
- **Todas las fotos** de la carpeta arman la **galería** (con carrusel y zoom/lupa al clickear).
- Las carpetas **vacías no se publican** (aparecen recién cuando les ponés una foto).

El archivo `data.js` se **genera solo** a partir de las carpetas. **No lo edites a mano.**

### Agregar / cambiar un producto
1. Creá (o renombrá) una carpeta dentro de `img/` con el nombre del producto.
2. Meté adentro **todas las fotos** que quieras mostrar.
   - El **orden** de las fotos es alfabético: si querés mandar una primero,
     renombrala `1.jpg`, `2.jpg`, etc.
3. **Regenerá el sitio**: doble clic en `generar.bat`
   *(o, si tenés Node, abrí una terminal en esta carpeta y corré `node generar-data.js`).*

### Precios y textos
Los precios/categorías/textos curados están en **`generar-data.js`** (sección `OVERRIDES`),
emparejados por palabras clave (aguanta renombres). Para ajustar un precio, editá ahí
`precioUSD` (y `precioListaUSD` para que vaya a **Descuentos**) y regenerá.
Las carpetas sin datos cargados salen con precio en 0 y categoría "Otros" → avisá y los completo.

> El número de WhatsApp y el lugar de retiro están en `CONFIG`, arriba de `generar-data.js`.

## Publicarlo online (opcional)
Es un sitio estático (HTML/CSS/JS), así que se puede subir gratis a:
- **Netlify** o **Vercel**: arrastrar la carpeta `microsite` y listo.
- **GitHub Pages**: subir la carpeta a un repo y activar Pages.

## Archivos
- `index.html` — estructura de la página
- `styles.css` — estilos
- `app.js` — lógica (dólar, filtros, WhatsApp)
- `data.js` — **los datos** (lo único que necesitás tocar)
