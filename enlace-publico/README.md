# Magic iPhone · enlace público alternativo

Este pequeño Worker muestra la tienda existente desde una dirección con el nombre del negocio. El catálogo, las fotos, los precios, el orden y el panel siguen usando los datos y el acceso del alojamiento original. No hay migración de base de datos, almacenamiento nuevo ni R2.

## Configuración

`wrangler.json` declara el Worker `tienda` en la cuenta del negocio. La dirección del alojamiento original se configura en Cloudflare como secreto `UPSTREAM_ORIGIN`; los alias anteriores se configuran en `UPSTREAM_ALIASES`, separados por comas. No se incluyen en este repositorio.

Publicar con Wrangler desde esta carpeta: `npx wrangler deploy`. La configuración de secretos se hace una sola vez. `node verify-proxy.mjs` comprueba rutas, cuerpos de subida, cookies privadas, protección ante escrituras de otro origen, redirecciones, fotos y respuestas dinámicas sin caché.

## Funcionamiento

El dueño entra a `/admin/` con su correo y contraseña habituales. Los cambios se guardan en el mismo catálogo y aparecen en ambos enlaces. La sesión se inicia de nuevo en la dirección alternativa porque cada dominio tiene sus propias cookies.

Las páginas, las consultas y las imágenes se solicitan al alojamiento original. Este acceso depende de que esa tienda siga activa y pública. La dirección del alojamiento no figura en el enlace público ni en los archivos de esta carpeta, pero esto no constituye una garantía de anonimato del propietario. El plan Workers Free tiene límites de solicitudes y ejecución.

No se deben volver a activar las tareas de migración canceladas para usar este enlace.
