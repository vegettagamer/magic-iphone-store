# Magic iPhone · alojamiento independiente

Tienda con catálogo público, cotizador y panel privado del dueño. Esta copia usa directamente Cloudflare Workers, D1 y R2. No usa servicios, inicio de sesión, bibliotecas ni base de datos de ChatGPT. El código se guarda en un repositorio privado de GitHub.

## Preparación y publicación

1. Node.js 22.13 o superior y `npm ci`.
2. `npx wrangler login`: iniciar sesión y autorizar tu cuenta Cloudflare.
3. Crear una base D1 `magic-iphone-catalog`; guardar su UUID real en `wrangler.json`, binding `DB`. Crear un bucket R2 `magic-iphone-photos`, binding `BUCKET`. Estos recursos deben estar en la misma cuenta que el Worker.
4. `npm run db:migrate` aplica únicamente el esquema a la base nueva.
5. Descargar una copia actual de los productos, orden y fotos de la tienda anterior. No guardar las copias en GitHub. Importar en la base NUEVA antes del primer acceso al panel: `npm run import:catalog -- /ruta/privada/catalog-snapshot.json`. El importador verifica que la base está vacía y nunca reemplaza datos existentes. Se recomienda pausar las ediciones del catálogo durante el traslado y comprobar de nuevo el contenido antes del cambio de enlace.
6. Configurar `ADMIN_EMAIL`, `ADMIN_AUTH_SECRET`, `ADMIN_SETUP_TOKEN_HASH` y `ADMIN_SETUP_EXPIRES` como secretos cifrados del Worker. No usar valores de ejemplo ni subir contraseñas, tokens o archivos `.dev.vars` a GitHub. Si la clave secreta original del servidor no está disponible, el dueño debe activar una contraseña para este nuevo alojamiento; no es posible recuperar su contraseña a partir del hash.
7. `npm run build` valida el paquete localmente. `npm run deploy` publica usando el UUID real de la base.
8. Cloudflare devuelve el enlace `workers.dev`. Comprobar acceso público, ingreso del dueño, catálogo, fotos, orden, cotizador y cambios desde otra sesión antes de retirar la web anterior. Se puede añadir un dominio propio cuando exista uno.

## Despliegue automático desde GitHub

En Cloudflare, Workers & Pages → Create → Import a repository → seleccionar el repositorio privado de Magic iPhone. Autorizar solo ese repositorio. Usar la rama `main`, raíz del proyecto, build `npm run check`, deploy `npm run deploy`. Cloudflare instala las dependencias desde `package-lock.json`. El nombre del Worker debe ser `magic-iphone-store`, igual que `wrangler.json`. La base y el bucket se crean una sola vez; los despliegues siguientes los reutilizan. Los secretos se configuran en Cloudflare, nunca como archivos del repositorio.

## Desarrollo

`npm run dev` sirve la web en el puerto 4174 con base y bucket locales. Las credenciales locales se guardan en `.dev.vars`, excluido de Git. `npm run check` verifica los módulos. Las tarjetas del panel y del catálogo público usan el mismo renderizador. La base conserva el orden, los productos ocultos y los precios. Las fotos subidas se sirven por `/media/` desde R2.
