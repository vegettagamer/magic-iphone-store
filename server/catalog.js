import {applyProductOrder} from '../public/product-order.js';
import {ownerIdentity,authAction} from './admin-auth.js';
import seedRows from './seed-rows.js';
import photoManifest from '../public/photos.json';
import shell from './storefront-shell.js';
import adminShell,{loginShell} from './admin-shell.js';
const noCache={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...noCache,'Content-Type':'application/json; charset=utf-8'}});
const html=(body,status=200)=>new Response(body,{status,headers:{...noCache,'Content-Type':'text/html; charset=utf-8','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin'}});
export const slugify=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const seeds=seedRows.map((r,id)=>({id:String(id),slug:slugify([r[0],r[2],r[3]].filter(Boolean).join('-')),name:r[0],category:r[1],storage:r[2],color:r[3],price:r[4],currency:r[5],condition:r[6],description:'',available:true,images:photoManifest[id].images,photoScale:Math.min(2,photoManifest[id].displayScale||1),photoSource:photoManifest[id].sourceUrl||'',photoNote:photoManifest[id].note||'',version:1}));
async function requireAdmin(req,env){const user=await ownerIdentity(req,env);if(!user.authorized)throw Object.assign(new Error('Entrá con el correo y contraseña del dueño.'),{status:401});return user;}
function checkWrite(req){if(req.headers.get('Origin')!==new URL(req.url).origin||req.headers.get('X-Magic-Admin')!=='1')throw Object.assign(new Error('La solicitud no pudo verificarse. Volvé a abrir el panel.'),{status:403});}
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const decode=r=>({...JSON.parse(r.data),id:r.id,slug:r.slug,version:r.version});
async function initialized(env){return !!await env.DB.prepare("SELECT value FROM catalog_meta WHERE key='initialized'").first();}
async function readOrder(env){const row=await env.DB.prepare("SELECT value FROM catalog_meta WHERE key='product_order'").first();return {raw:row?.value||'',...(row?JSON.parse(row.value):{ids:[],revision:''})};}
export async function readProducts(env,order){if(!await initialized(env))return seeds;const result=await env.DB.prepare('SELECT id,slug,data,version FROM products ORDER BY rowid').all();return applyProductOrder(result.results.map(decode),(order||await readOrder(env)).ids);}
export function validateProduct(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Los datos del producto no son válidos.');
 const field=(key,max,required=false)=>{if(typeof raw[key]!=='string')fail('Revisá el campo '+key+'.');const v=raw[key].trim();if(v.length>max||(required&&!v))fail('Revisá el campo '+key+'.');return v;};
 const name=field('name',120,true),category=field('category',50,true),storage=field('storage',80),color=field('color',60),description=field('description',2000);
 if(typeof raw.price!=='number'||!Number.isFinite(raw.price)||raw.price<=0||raw.price>1000000000||Math.abs(Math.round(raw.price*100)-raw.price*100)>0.00001)fail('Ingresá un precio válido, con hasta dos decimales.');
 if(!['USD','ARS'].includes(raw.currency))fail('Elegí USD o ARS.');if(!['Nuevo','Usado','Consultar'].includes(raw.condition))fail('Elegí el estado del producto.');if(typeof raw.available!=='boolean')fail('Revisá la disponibilidad.');
 if(!Array.isArray(raw.images)||!raw.images.length||raw.images.length>5||raw.images.some(x=>typeof x!=='string'||!/^\/(images\/[a-zA-Z0-9_./-]+|media\/[a-f0-9-]{36}\.(jpg|png|webp))$/.test(x)||x.includes('..')))fail('Agregá de una a cinco fotos válidas.');
 return {name,category,storage,color,description,price:raw.price,currency:raw.currency,condition:raw.condition,available:raw.available,images:[...new Set(raw.images)]};
}
async function bodyJSON(req,max=20000){if(!req.headers.get('content-type')?.includes('application/json'))fail('Formato no válido.',415);const bytes=await boundedBody(req,max);try{return JSON.parse(new TextDecoder().decode(bytes))}catch{fail('No pudimos leer los datos.');}}
async function boundedBody(req,max){if(Number(req.headers.get('content-length'))>max)fail('El archivo supera el tamaño permitido.',413);const reader=req.body?.getReader();if(!reader)fail('No recibimos datos.');const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail('El archivo supera el tamaño permitido.',413)}chunks.push(value);}const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}return all;}
async function upload(req,env){const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'},type=req.headers.get('content-type')?.split(';')[0];if(!types[type])fail('Usá fotos JPG, PNG o WebP.',415);const data=await boundedBody(req,8*1024*1024);const valid=type==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:type==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>data[i]===v):new TextDecoder().decode(data.slice(0,4))==='RIFF'&&new TextDecoder().decode(data.slice(8,12))==='WEBP';if(!valid)fail('El archivo no es una imagen compatible.',415);const key=crypto.randomUUID()+'.'+types[type];await env.BUCKET.put(key,data,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'}});return json({url:'/media/'+key},201);}
async function adminAPI(req,env,path){
 const user=await ownerIdentity(req,env);
 if(path==='/api/admin/session'&&req.method==='GET')return json({authenticated:user.authenticated,authorized:user.authorized,email:user.authenticated?user.email:null});
 if(['/api/admin/login','/api/admin/activate','/api/admin/logout'].includes(path)&&req.method==='POST'){checkWrite(req);return authAction(req,env,path.split('/').pop(),await bodyJSON(req));}
 await requireAdmin(req,env);if(!['GET','HEAD'].includes(req.method))checkWrite(req);
 if(path==='/api/admin/products'&&req.method==='GET'){const order=await readOrder(env);return json({initialized:await initialized(env),products:await readProducts(env,order),orderRevision:order.revision});}
 if(path==='/api/admin/initialize'&&req.method==='POST'){
  if(await initialized(env))return json({ok:true});
  const statements=seeds.map(p=>env.DB.prepare('INSERT OR IGNORE INTO products (id,slug,data,version,updated_at) VALUES (?,?,?,?,?)').bind(p.id,p.slug,JSON.stringify(p),1,new Date().toISOString()));
  statements.push(env.DB.prepare("INSERT OR IGNORE INTO catalog_meta (key,value) VALUES ('initialized','1')"));await env.DB.batch(statements);return json({ok:true});
 }
 if(path==='/api/admin/upload'&&req.method==='POST')return upload(req,env);
 if(!await initialized(env))fail('Prepará el catálogo antes de editarlo.',409);
 if(path==='/api/admin/products/order'&&req.method==='PUT'){
  const raw=await bodyJSON(req,100000),order=await readOrder(env),products=await readProducts(env,order);
  if(typeof raw.revision!=='string'||raw.revision!==order.revision)fail('El orden cambió en otra sesión. Actualizá el catálogo antes de volver a ordenarlo.',409);
  if(!Array.isArray(raw.ids)||raw.ids.length!==products.length||raw.ids.some(id=>typeof id!=='string')||new Set(raw.ids).size!==raw.ids.length||products.some(p=>!raw.ids.includes(p.id)))fail('El catálogo cambió. Actualizalo antes de guardar el orden.',409);
  const next={ids:raw.ids,revision:crypto.randomUUID()};
  const result=await env.DB.prepare("INSERT INTO catalog_meta (key,value) VALUES ('product_order',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE catalog_meta.value=?").bind(JSON.stringify(next),order.raw).run();
  if(!result.meta.changes)fail('El orden cambió en otra sesión. Actualizá el catálogo antes de volver a ordenarlo.',409);
  return json({products:applyProductOrder(products,next.ids),orderRevision:next.revision});
 }
 if(path==='/api/admin/products'&&req.method==='POST'){
  const data=validateProduct(await bodyJSON(req)),id=crypto.randomUUID(),slug=(slugify([data.name,data.storage,data.color].filter(Boolean).join('-'))||'producto')+'-'+id.slice(0,8);const p={...data,id,slug,version:1,photoScale:1,photoSource:'',photoNote:''};
  await env.DB.prepare('INSERT INTO products (id,slug,data,version,updated_at) VALUES (?,?,?,?,?)').bind(id,slug,JSON.stringify(p),1,new Date().toISOString()).run();return json({product:p},201);
 }
 const match=path.match(/^\/api\/admin\/products\/([a-zA-Z0-9-]+)$/);
 if(match){
  const id=match[1];const current=await env.DB.prepare('SELECT id,slug,data,version FROM products WHERE id=?').bind(id).first();if(!current)fail('Este producto ya no existe.',404);
  const raw=await bodyJSON(req);if(!Number.isInteger(raw.version)||raw.version!==current.version)fail('El producto cambió en otra sesión. Volvé a cargarlo antes de guardar.',409);
  if(req.method==='DELETE'){const r=await env.DB.prepare('DELETE FROM products WHERE id=? AND version=?').bind(id,raw.version).run();if(!r.meta.changes)fail('El producto cambió. Actualizá el panel.',409);return json({ok:true});}
  if(req.method==='PUT'){
   const data=validateProduct(raw),old=decode(current),p={...old,...data,version:current.version+1};if(JSON.stringify(old.images)!==JSON.stringify(data.images)){p.photoScale=1;p.photoSource='';p.photoNote='';}
   const result=await env.DB.prepare('UPDATE products SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(p),new Date().toISOString(),id,raw.version).run();if(!result.meta.changes)fail('El producto cambió. Actualizá el panel.',409);return json({product:p});
  }
 }
 return json({error:'Ruta no encontrada.'},404);
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function handleRequest(req,env){
 try{
  const url=new URL(req.url),path=url.pathname.replace(/\/$/,'')||'/';
  if(path.startsWith('/api/admin/'))return await adminAPI(req,env,path);
  if(path==='/api/products'&&req.method==='GET'){const products=(await readProducts(env)).filter(p=>p.available);return json({products});}
  if(path.startsWith('/media/')&&req.method==='GET'){
   const key=path.slice(7);if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key))return new Response('No encontrado',{status:404});const obj=await env.BUCKET.get(key);if(!obj)return new Response('No encontrado',{status:404});return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
  }
  if((path==='/admin'||path==='/admin/activar')&&req.method==='GET')return html((await ownerIdentity(req,env)).authorized?adminShell:loginShell);
  if(path==='/sitemap.xml'){
   const products=(await readProducts(env)).filter(p=>p.available);const paths=['/','/catalogo/','/catalogo/iphone-usados/','/catalogo/iphone-sellados/','/vende-tu-equipo/','/preguntas-frecuentes/','/contacto/',...products.map(p=>'/producto/'+p.slug+'/')];return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+escape(url.origin+p)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json({error:'Método no permitido.'},405);
  if(path.startsWith('/producto/')){
   const slug=path.slice(10);const p=(await readProducts(env)).find(x=>x.slug===slug&&x.available);if(!p)return html(shell,404);
   const title=escape([p.name,p.storage,p.color].filter(Boolean).join(' · '));const desc=escape(`${p.name}. ${p.currency} ${p.price}. Consultá disponibilidad en Magic iPhone.`);
   const page=shell.replace(/<title>.*?<\/title>/,`<title>${title} | Magic iPhone</title>`).replace('</head>',`<meta property="og:title" content="${title} | Magic iPhone"><meta property="og:description" content="${desc}"><meta property="og:image" content="${escape(url.origin+p.images[0])}"></head>`);return html(page);
  }
  if(['/','/catalogo','/catalogo/iphone-usados','/catalogo/iphone-sellados','/vende-tu-equipo','/preguntas-frecuentes','/contacto','/mi-seleccion'].includes(path))return html(shell);
  return new Response('No encontrado',{status:404});
 }catch(error){console.error('Catalog request failed',error.status||500,error.status?error.message:'Internal storage error');return json({error:error.status?error.message:'No pudimos completar la operación. Intentá nuevamente.'},error.status||503);}
}
