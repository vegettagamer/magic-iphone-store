const OWNER_COOKIE='__Host-magic_owner';
const unsafe=method=>!['GET','HEAD','OPTIONS'].includes(method);
const error=(text,status)=>new Response(text,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
function originOf(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Invalid upstream configuration');return url.origin;}
export async function proxy(request,env,upstreamFetch=fetch){
 let upstream,aliases;
 try{upstream=originOf(env.UPSTREAM_ORIGIN);aliases=[...new Set([upstream,...(env.UPSTREAM_ALIASES||'').split(',').filter(Boolean).map(originOf)])];}catch{return error('La tienda está preparando su acceso. Intentá nuevamente en unos minutos.',503);}
 const publicURL=new URL(request.url),publicOrigin=publicURL.origin;
 if(aliases.includes(publicOrigin))return error('Configuración de enlace no válida.',503);
 // Retain the shop's same-origin protection on its alternate hostname.
 if(unsafe(request.method)&&request.headers.get('Origin')!==publicOrigin)return error('La solicitud no pudo verificarse. Abrí el panel desde este enlace.',403);
 const target=new URL(publicURL.pathname+publicURL.search,upstream);
 if(target.origin!==upstream)return error('Ruta no válida.',400);
 const rewrite=value=>{let result=value;for(const origin of aliases)result=result.replaceAll(origin,publicOrigin);return result;};
 const headers=new Headers(request.headers);
 headers.delete('host');headers.delete('authorization');headers.delete('x-forwarded-host');headers.delete('x-forwarded-proto');
 const cookies=(request.headers.get('Cookie')||'').split(';').map(c=>c.trim()).filter(c=>c.startsWith(OWNER_COOKIE+'='));
 if(cookies.length===1)headers.set('Cookie',cookies[0]);else headers.delete('Cookie');
 if(headers.has('Origin'))headers.set('Origin',upstream);
 const referer=headers.get('Referer');if(referer?.startsWith(publicOrigin+'/'))headers.set('Referer',upstream+referer.slice(publicOrigin.length));else headers.delete('Referer');
 let response;
 try{response=await upstreamFetch(new Request(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:'half',redirect:'manual'}));}catch{return error('No pudimos conectar con la tienda. Intentá nuevamente en unos minutos.',502);}
 const responseHeaders=new Headers(response.headers);
 for(const name of ['Location','Content-Location','Link','Refresh','Content-Security-Policy']){const value=responseHeaders.get(name);if(value)responseHeaders.set(name,rewrite(value));}
 const setCookies=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():typeof response.headers.getAll==='function'?response.headers.getAll('Set-Cookie'):[response.headers.get('Set-Cookie')].filter(Boolean);
 responseHeaders.delete('Set-Cookie');
 for(const value of setCookies){if(value.startsWith(OWNER_COOKIE+'='))responseHeaders.append('Set-Cookie',value.replace(/;\s*Domain=[^;]+/ig,''));}
 responseHeaders.delete('server');responseHeaders.delete('x-powered-by');
 const type=responseHeaders.get('Content-Type')||'';
 const textual=/^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/i.test(type);
 let body=response.body;
 if(request.method==='HEAD'||[204,205,304].includes(response.status))body=null;
 else if(textual){body=rewrite(await response.text());for(const name of ['Content-Length','Content-Encoding','ETag','Content-MD5'])responseHeaders.delete(name);}
 if(publicURL.pathname.startsWith('/api/')||publicURL.pathname.startsWith('/admin')||type.includes('text/html'))responseHeaders.set('Cache-Control','no-store');
 return new Response(body,{status:response.status,statusText:response.statusText,headers:responseHeaders});
}
export default {fetch:(request,env)=>proxy(request,env)};
