# Magic iPhone

## Enlace público actual

- Panel de enlaces para Instagram: https://links.magic-iphone-ros.workers.dev/
- Tienda: https://tienda.magic-iphone-ros.workers.dev/
- Administración: https://tienda.magic-iphone-ros.workers.dev/admin/

El enlace alternativo mantiene la tienda existente detrás. Los productos, las fotos, los precios, el orden y las credenciales del dueño siguen en el alojamiento original. Los cambios hechos desde el panel aparecen automáticamente en ambos enlaces. El dueño debe iniciar sesión en cada dominio con su correo y contraseña habituales.

La implementación activa de la tienda está en `enlace-publico/`; la del panel de enlaces para Instagram está en `panel-enlaces/`. No usa la base D1 ni el almacenamiento R2 de esta cuenta de Cloudflare. La dirección interna del alojamiento original está guardada como secreto del Worker y no se publica en los archivos de esa carpeta.

## Código y mantenimiento

Para actualizar solo el enlace: `npx wrangler deploy --config enlace-publico/wrangler.json`. La carpeta contiene sus instrucciones y pruebas. Cambiar el catálogo desde el panel no necesita subir archivos a GitHub.

Los archivos de la raíz conservan una copia de la tienda preparada anteriormente para una migración independiente. **Esa migración fue cancelada: no ejecutar su despliegue, importación de datos ni configuración de R2 para usar el enlace actual.** Los cambios de código de la tienda original se siguen publicando en su alojamiento original; este enlace los muestra al solicitarlos.

El acceso alternativo depende de que la tienda original permanezca activa y pública. Cloudflare Workers Free tiene límites de solicitudes y ejecución.
