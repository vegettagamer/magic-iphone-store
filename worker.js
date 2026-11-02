import {handleRequest} from './server/catalog.js';
const pagePaths=new Set(['/','/catalogo','/catalogo/iphone-usados','/catalogo/iphone-sellados','/vende-tu-equipo','/preguntas-frecuentes','/contacto','/mi-seleccion']);
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,'')||'/';
  if(path==='/robots.txt')return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin/\nSitemap: ${url.origin}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
  const dynamic=pagePaths.has(path)||path==='/sitemap.xml'||['/api/','/admin','/producto/','/media/'].some(prefix=>path.startsWith(prefix));
  if(dynamic){const response=await handleRequest(request,env);if(request.method==='HEAD')return new Response(null,{status:response.status,headers:response.headers});return response;}
  return env.ASSETS.fetch(request);
 }
};
