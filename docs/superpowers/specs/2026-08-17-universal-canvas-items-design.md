# Items universales, carpetas y Home útil

Fecha: 2026-08-17  
Estado: aprobado en diseño; pendiente de revisión del spec escrito  
App: Orbit

## Problema

Hoy hay dos capas que no se tocan: widgets flotantes del canvas (`space_widgets` / `home_canvas_items`) y CRUD plano por space (`travel_bags`, `bag_items`, `clothing_items`, `sale_items`, …). Viajes no se siente como maleta-con-cosas: son dos paneles y un select. Las fotos se piden como URL. El Home es un canvas vacío; no dice si una maleta está lista, qué se vende o dónde se postuló.

La usuaria se va del país: necesita empacar, saber qué se lleva, vender cosas y llevar un tablero de trabajo. Quiere componentes reutilizables, no un formulario distinto por space.

## Objetivo

Un solo primitive visual y de datos: el **item de canvas**. La **carpeta** es el core (contenedor rico, no un mini-space). Pegar un link o una imagen en cualquier canvas crea el item solo. El Home resume lo próximo a vencer y el estado de maletas, ventas y postulaciones.

## Fuera de alcance

- Stickers PNG sueltos en el canvas
- Calendario, timeline, temporizador
- Kanban de columnas para trabajo
- Convertir wishlist, proyectos e inspiración a carpetas
- Cambiar el modelo de gacha, comida o suscripciones
- Arrastrar un item suelto hacia una carpeta para anidarlo (reparentar)
- Borrar spaces

## Decisiones cerradas

1. El widget **es** el dato. No hay adaptador encima de `travel_bags`.
2. Portada / foto del item: **siempre subida** (PNG/JPEG/WebP/AVIF), nunca un campo “URL de imagen”.
3. Stickers decorativos son otro spec.
4. Dentro de carpeta: checklist (nombre + checkbox + foto opcional) y sub-items tipados (nota, imagen, enlace, lista, contador).
5. Anidamiento: carpeta → subcarpeta → hojas. Nada más profundo.
6. Tablas de inventario de viajes/ropa/ventas se reemplazan (no hay datos que migrar).
7. Enfoque: items universales en el canvas; gacha/comida/suscripciones y `deadlines` se quedan.
8. Los tipos de item viven en **todos** los canvas, incluido Inicio.
9. Este spec incluye core + ventas + tablero de trabajo + Home útil.
10. La carpeta es **rica, no profunda**: no tiene canvas interior.
11. Carpeta abierta = widget expandido en el canvas, no modal ni ruta nueva.
12. Pegar URL/imagen con carpeta abierta crea el hijo **dentro**; si no, en el canvas.
13. Reparentar por drag queda fuera de v1.

## Arquitectura

### Primitive: `orbit_items`

Una fila por todo lo que se coloca en Inicio o en un space.

| Campo | Rol |
|---|---|
| `id`, `user_id` | Identidad. RLS: el usuario solo ve lo suyo. |
| `space_id` | FK a `orbit_spaces`. `null` = canvas de Inicio. |
| `parent_id` | FK a `orbit_items`. `null` = vive en el canvas. |
| `kind` | `folder` \| `list` \| `check_item` \| `note` \| `image` \| `link` \| `countdown` |
| `title` | Obligatorio. Imagen: nombre de archivo sin extensión, editable. Link: `og_title` si existe, si no el hostname; editable. |
| `body` | JSONB. Nota = documento TipTap (mismo shape que `space_widgets.content` hoy). Otros kinds: `{}`. |
| `cover_path` | Portada subida (Storage). Nullable. |
| `image_path` | Archivo del item `image`, o miniatura de un `check_item`. Distinto de portada. |
| `url` | Solo `link`. |
| `og_title`, `og_description`, `og_image_path` | Cache del preview. La imagen OG se **descarga** a Storage. |
| `status` | Texto libre acotado por el space (ver presets). Nullable. |
| `price` | Numeric. Usado en Ventas. Nullable. |
| `due_date` | Si existe, se sincroniza a `deadlines`. |
| `checked` | Solo `check_item`. |
| `sort_order` | Orden entre hermanos (hijos del mismo `parent_id`). |
| `position_x`, `position_y`, `width`, `height` | Solo si `parent_id` is null (item de canvas). Coordenadas de mundo, igual que el canvas actual. |
| `created_at`, `updated_at` | |

Constraints:

- `parent_id` no puede apuntar a sí mismo.
- Hijo solo de `folder` o `list`.
- `list` solo tiene hijos `check_item`.
- `folder` cuyos padres ya son `folder` no puede tener hijos `folder` (máximo un nivel de subcarpeta).
- Items hoja (`note`, `image`, `link`, `countdown`, `check_item`) no tienen hijos.
- `kind = link` exige `url`.
- `kind = countdown` exige `due_date`.
- `kind = image` exige `image_path`.
- `kind = check_item` exige `parent_id`.

Un trigger o check (función) rechaza carpeta dentro de subcarpeta. No se ofrece en la UI.

### Relación con tablas actuales

**Se dejan de usar (drop después de que el canvas nuevo funcione):**

- `travel_bags`, `bag_items`
- `clothing_items`
- `sale_items`
- `space_widgets`
- `home_canvas_items`

No hay migración de filas: el proyecto no tiene datos de inventario/widgets que preservar. Si al implementar hay filas, se ignoran y se dropean; no se escribe un ETL.

**Se quedan:**

- `deadlines`, `gacha_*`, `food_items`, `subscriptions`
- `wishlist`, `projects`, `inspiration` (CRUD; no pasan a carpetas en este spec)
- `orbit_spaces`, `space_preferences`

### Space `jobs`

Nuevo `kind` prebuilt: `jobs`, nombre **Trabajo**, icono `briefcase` (hay que añadirlo al check de `orbit_spaces.icon`), posición `75` (entre Ventas 70 y Proyectos 80).

No tiene resources CRUD. Es un canvas de items (enlaces con estado, listas, carpetas).

Viajes, Ropa y Ventas tampoco tienen `ResourceSection`: su contenido son `orbit_items`. Gacha, Comida y Suscripciones siguen con CRUD + canvas.

### Status por space

Un solo campo `status`. La UI elige etiquetas según `orbit_spaces.kind` del space (en Inicio, según el kind del item… no: en Inicio el item no tiene kind de space). Regla:

- El preset lo define el **space donde vive** el item (`space_id` → `kind`).
- En Inicio (`space_id` null) no se muestra selector de status salvo que el item ya tenga uno; no se obliga.

Presets:

| Space | Kinds que muestran status | Valores |
|---|---|---|
| `travel` | `folder` (maleta) | `pending` / `ready` → Pendiente / Listo |
| `sales` | `folder` (producto) | `available` / `sold` → Disponible / Vendido |
| `jobs` | `link` (y `folder` si se usa como empresa) | `saved` / `applied` / `interview` / `offer` / `rejected` → Guardado / Postulé / Entrevista / Oferta / Rechazado |
| resto | oculto | null |

El progreso de empaque (`3/12`) **no** es `status`. Se deriva: `check_item.checked` dentro de esa carpeta (recursivo un nivel: hijos directos + hijos de subcarpetas y de listas). `ready`/`pending` lo pone la usuaria.

### Deadlines

`deadlines.space_type` gana el valor `orbit_item`. `source_table = 'orbit_items'`, `source_id = orbit_items.id`.

Al crear/actualizar un item con `due_date`: upsert deadline `active`, título = título del item, `image_url` = null. Upcoming v1 muestra título y fecha; no sincroniza portadas. Al quitar `due_date` o borrar el item: **borrar** esa fila de `deadlines`. Gacha/comida/suscripciones siguen con sus triggers.

Upcoming del Home: `deadlines` activos con `due_date < now() + 7 días`, igual que `lib/dashboard.ts`. Incluye gacha, comida, suscripciones **y** items con fecha (entrevista, viaje, contador).

## Imagen: regla única

Ningún formulario pide “URL de imagen”.

- Componentes de canvas: uploader compartido (file picker, pegar, drop). Compresión en cliente: lado largo ~1200px, calidad ~0.7. PNG de portada **conserva transparencia** (no forzar JPEG).
- Tipos: `image/png`, `image/jpeg`, `image/webp`, `image/avif`. Tope 10 MB antes de comprimir.
- Bucket: `orbit-canvas`.
- Wishlist, proyectos e inspiración: se añade `image_path` (Storage). El form usa el uploader compartido. Se deja de escribir `image_url`; se dropea la columna en la misma migración (no hay datos).
- Gacha, comida y suscripciones **no** cambian su campo de imagen en este spec.

El único URL que la usuaria pega es el de una **página** (`link`), no el de un archivo.

## Enlaces y paste

Comportamiento moderno, en **cualquier** canvas (Inicio y todos los spaces):

| Portapapeles | Resultado |
|---|---|
| Archivo imagen | Item `image` |
| Texto `http://` o `https://` | Item `link`; fetch OG en servidor |
| Otro texto | Item `note` con ese cuerpo |

Si hay una carpeta **abierta** (estado de UI) o el foco está dentro de ella, `parent_id` = esa carpeta. Si no, item de canvas en el centro de la vista.

Varias imágenes pegadas/soltadas: un item por archivo.

Fetch OG (server action):

1. Crear el `link` al instante con `url` y título provisional (hostname).
2. Pedir HTML, leer `og:title`, `og:description`, `og:image` (o Twitter). Timeout corto (~5s).
3. Descargar `og:image` a Storage → `og_image_path`.
4. Si falla: el item permanece; la tarjeta muestra dominio + URL; botón Reintentar. La usuaria puede subir `cover_path` y esa portada **gana** sobre OG.

Wishlist (y cualquier CRUD con `url`): al pegar en el campo enlace, el mismo helper de OG hidrata un preview en el form. No crea un `orbit_item` a menos que se pegue en el canvas.

Barra **Agregar** (Inicio y spaces): un control que abre tipos — Carpeta, Lista, Nota, Imagen, Enlace, Contador. No seis botones fijos. Enlace pide URL y usa el mismo pipeline. Imagen abre file picker.

Atajos actuales N / T / I se remapean: N = nota, I = imagen. T = lista (ya no una hoja titulada “Tarea”). Carpeta y contador no necesitan atajo en v1.

## UI

### Carpeta colapsada

Portada (`cover_path`, o color/empty state si no hay) + título + un dato:

- Viajes: `status` + progreso `n/m`
- Ventas: `price` + `status`
- Trabajo: no aplica salvo que sea carpeta-empresa
- Otros: solo título, o `n` hijos

Clic (no el handle de drag) expande el widget en el sitio.

### Carpeta expandida

Lista de hijos. Cada `check_item`: checkbox, nombre editable, miniatura opcional. Acciones: añadir dentro (tipos permitidos según profundidad), cambiar portada, status, precio si el space es ventas, fecha si se quiere deadline.

Subcarpeta: mismo patrón, sin anidar otra carpeta.

Cerrar: vuelve al compacto. El tamaño expandido no tiene que persistir; posición sí.

### Enlace

Tarjeta: imagen (cover > OG > placeholder), título, descripción (máx. ~2 líneas), dominio. En Trabajo, selector de status en la tarjeta.

### Contador

Título + días restantes / “hoy” / “hace n días” según `due_date`. Escribe en `deadlines`.

### Lista suelta

Item `list` en el canvas; hijos `check_item`. Sirve para packing rápido o “dónde postulé” sin carpeta.

### Home

Tres capas, en este orden:

1. **Próximo** — Upcoming a 7 días (`getDashboardData` / `deadlines`). Hoy el dashboard existe en código y **no** está montado en `/`; este spec lo vuelve a poner encima del canvas.
2. **Estado** — tres recuentos del **prebuilt** de cada kind (si hay spaces duplicados, solo `is_prebuilt`):
   - Viajes: carpetas raíz `pending` vs `ready`
   - Ventas: carpetas raíz `available` vs `sold`
   - Trabajo: links por status (al menos activas = `saved`+`applied`+`interview`)
   Clic → `/spaces/{id}` de ese prebuilt.
3. **Canvas** — `orbit_items` con `space_id` null. Misma barra Agregar.

Resurface (proyectos/inspiración por `last_viewed_at`) **no** entra en este spec. El Home de este trabajo es Próximo + Estado + canvas.

### Spaces inventario

Viajes / Ropa / Ventas / Trabajo: canvas vacío + items. Sin paneles `ResourceSection`.

Ropa: carpetas por tipo o cajón (“Abrigos”) con prendas como `check_item` o sub-items imagen+nota. Sin tabla `clothing_items`.

Ventas: una carpeta por producto (portada subida, precio, status). Hijos: links de publicación, notas, fotos extra.

Trabajo: pegar ofertas → links con preview y status. Listas para pipeline si se quiere.

## Componentes (límites)

Archivos nuevos, cada uno < 250 líneas, lógica en `/lib`:

| Unidad | Qué hace | Depende de |
|---|---|---|
| `lib/orbit-items.ts` | Tipos, lecturas, reglas de anidamiento | Supabase |
| `lib/item-status.ts` | Presets de status por `SpaceKind` | `orbit-spaces` |
| `lib/link-preview.ts` | Fetch OG + guardar imagen | fetch, Storage |
| `lib/item-deadlines.ts` | Sync `orbit_items.due_date` → `deadlines` | `deadlines` |
| `lib/home-summaries.ts` | Recuentos maletas/ventas/trabajo | `orbit_items` + spaces |
| `app/(app)/item-actions.ts` | Crear/editar/borrar/pegar | libs de arriba |
| `components/items/add-item-picker.tsx` | Barra Agregar | actions |
| `components/items/folder-widget.tsx` | Carpeta compacta/expandida | hijos |
| `components/items/link-card.tsx` | Tarjeta de enlace | — |
| `components/items/countdown-widget.tsx` | Contador | — |
| `components/items/list-widget.tsx` | Lista + check items | — |
| `components/items/image-uploader.tsx` | Subida/pegar/comprimir | Storage cliente |
| `components/home/home-upcoming.tsx` | Bloque Próximo | dashboard |
| `components/home/home-summaries.tsx` | Recuentos | `home-summaries` |

`SpaceCanvas` y `HomeCanvas` pasan a renderizar `orbit_items` en vez de widgets/home items. Si `space-canvas.tsx` supera 250 líneas al añadir tipos, extraer el widget switch a `components/items/canvas-item.tsx`. No hay refactor cosmética fuera de eso.

`ResourceForm`: nuevo `CrudFieldType` `"image"` (uploader). Quitar `"url"` de campos de imagen. El campo `url` de wishlist sigue siendo URL de **página**.

## Flujo de datos

```
Usuario pega / Agregar
  → item-actions (crea fila + Storage si hay archivo)
  → si link: link-preview async
  → si due_date: item-deadlines
  → canvas local añade el item (optimistic donde ya existe el patrón)

Home load
  → deadlines (7d) + home-summaries + orbit_items where space_id is null
```

Borrar carpeta: cascade hijos, borrar archivos Storage de esos paths, borrar deadlines de esos ids. Confirmación antes de borrar carpeta no vacía.

Fallo de Storage a mitad: no dejar fila `image`/`cover` sin archivo; revertir el insert.

Fallo de OG: no revertir el link.

Fallo de sync deadline: el item se queda; el próximo save reintenta.

## Home: recuentos, detalle

- Viajes: `count(folder)` con `parent_id is null` y `space_id` = prebuilt travel. Agrupar por `status` (`pending` / `ready` / null). Mostrar “X pendientes · Y listas”. Null cuenta como pendiente.
- Ventas: igual con `available` / `sold`. Null = disponible para el recuento.
- Trabajo: `count(link)` en prebuilt jobs. Mostrar “N activas” (`saved`+`applied`+`interview`) y “N en entrevista” (`interview`).

## Pruebas

**Lib / SQL**

- Item en space y en Inicio (`space_id` null).
- Carpeta → subcarpeta → hoja; rechazar tercera carpeta.
- Borrar carpeta borra hijos, Storage y `deadlines`.
- `due_date` crea / actualiza / borra deadline `orbit_item`.
- RLS: un usuario no lee items de otro.

**Acciones**

- Pegar URL → `link` + OG cacheado; fallback si el fetch falla.
- Pegar imagen → `image` comprimida.
- Uploader en wishlist / proyecto / inspiración: no queda input URL de imagen.
- Recuentos Home con los status acordados.

**Manual**

- Viajes: maleta + lista + fotos + check; Home muestra pendiente.
- Ventas: producto con foto subida + link de publicación.
- Trabajo: pegar oferta → tarjeta; pasar a Postulé.
- Pegar link en Inicio y dentro de carpeta abierta.

## Criterio de hecho

- Barra Agregar igual en Inicio y spaces, con los seis tipos.
- Viajes/Ropa/Ventas/Trabajo se organizan con carpetas e items, no con `ResourceSection`.
- Pegar link/imagen se siente igual que el canvas actual, pero el link trae tarjeta OG.
- No existe campo “URL de imagen” en los forms tocados.
- Home muestra Próximo + recuentos + canvas.
- Gacha/comida/suscripciones intactos como dominio de urgencia.

## Fases sugeridas (un solo spec, un plan)

1. Esquema `orbit_items` + kind `jobs` + drop path de inventario al final de la fase de UI.
2. Canvas lee/escribe `orbit_items` (nota, imagen, enlace mínimo) y deja de usar `space_widgets` / `home_canvas_items`.
3. Carpeta + lista + check_item + reglas de profundidad + uploader de portada.
4. OG al pegar + status/precio + countdown + sync deadlines.
5. Home: Upcoming + summaries.
6. ResourceForm image upload en wishlist/proyectos/inspiración; quitar CRUD travel/clothing/sales; drop tablas muertas.

## Notas de producto

Orbit sigue distinguiendo **urgencia** (`deadlines`) e **inventario** (items). Las carpetas no sustituyen un evento de gacha. Un contador o una fecha de entrevista sí pueden entrar a Upcoming porque tienen `due_date`.
