# Magic iPhone · panel de enlaces

Entrada pública para la página de enlaces de Instagram. Muestra el diseño del alojamiento original y dirige el botón de la web a la dirección alternativa de la tienda.

La dirección interna se configura en Cloudflare como secreto `UPSTREAM_ORIGIN`. `ORIGIN_REWRITES` contiene un objeto JSON con los orígenes anteriores de la tienda y su destino público actual. Estos valores no se publican en este repositorio. No necesita R2 ni una base de datos nueva.

Publicar desde esta carpeta con `npx wrangler deploy`. Comprobar con `node verify-proxy.mjs`. La página original debe permanecer activa y pública; sus cambios se reflejan en este enlace.
