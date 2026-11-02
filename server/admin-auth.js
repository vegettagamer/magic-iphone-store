const encoder=new TextEncoder();
const sessionSeconds=7*24*60*60;
const error=(message,status)=>{throw Object.assign(new Error(message),{status});};
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
const owners=env=>(env.ADMIN_EMAIL||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
const emailOf=raw=>typeof raw.email==='string'?raw.email.trim().toLowerCase():'';
function requireConfig(env){if(!env.ADMIN_AUTH_SECRET||!owners(env).length)error('El acceso todavía no está configurado.',503);}
export async function passwordHash(password,salt,secret){
 const pepperKey=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const peppered=await crypto.subtle.sign('HMAC',pepperKey,encoder.encode(password));
 const material=await crypto.subtle.importKey('raw',peppered,'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},material,256)));
}
function cookieName(req){return new URL(req.url).protocol==='https:'?'__Host-magic_owner':'magic_owner_local';}
function cookie(req,token,maxAge=sessionSeconds){const secure=new URL(req.url).protocol==='https:'?'; Secure':'';return `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;}
const response=(body,status=200,cookieValue=null)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookieValue?{'Set-Cookie':cookieValue}:{})}});
function readToken(req){const name=cookieName(req)+'=';const tokens=(req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name));if(tokens.length!==1)return '';const token=tokens[0].slice(name.length);return /^[a-f0-9]{64}$/.test(token)?token:'';}
export async function ownerIdentity(req,env){const token=readToken(req);if(!token)return {authenticated:false,authorized:false,email:null};const row=await env.DB.prepare('SELECT email,expires_at FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).first();const valid=!!row&&row.expires_at>Date.now()&&owners(env).includes(row.email);return {authenticated:valid,authorized:valid,email:valid?row.email:null};}
async function rateLimit(req,env){
 const ip=req.headers.get('cf-connecting-ip')||'unknown';const key=await digest('auth:'+ip);const now=Date.now(),reset=now+15*60*1000;
 const row=await env.DB.prepare('INSERT INTO auth_limits (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING attempts').bind(key,reset,now,now,reset).first();if(row.attempts>12)error('Demasiados intentos. Volvé a intentar dentro de 15 minutos.',429);
 return key;
}
async function session(req,env,email){const token=random();await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(Date.now()).run();await env.DB.prepare('INSERT INTO admin_sessions (token_hash,email,expires_at) VALUES (?,?,?)').bind(await digest(token),email,Date.now()+sessionSeconds*1000).run();return response({ok:true},200,cookie(req,token));}
export async function authAction(req,env,action,raw){
 requireConfig(env);if(!raw||typeof raw!=='object'||Array.isArray(raw))error('Solicitud no válida.',400);
 if(action==='logout'){const token=readToken(req);if(token)await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run();return response({ok:true},200,cookie(req,'',0));}
 const key=await rateLimit(req,env),email=emailOf(raw);
 if(action==='activate'){
  const token=typeof raw.token==='string'?raw.token:'';
  if(!/^[a-f0-9]{64}$/.test(token)||!equal(await digest(token),env.ADMIN_SETUP_TOKEN_HASH)||Number(env.ADMIN_SETUP_EXPIRES)<=Date.now()||!Number.isFinite(Number(env.ADMIN_SETUP_EXPIRES))||!owners(env).includes(email))error('El enlace no es válido, venció o ya fue utilizado.',403);
  if(await env.DB.prepare('SELECT email FROM admin_credentials WHERE email=?').bind(email).first())error('Este acceso ya fue activado. Entrá con tu correo y contraseña.',409);
  if(typeof raw.password!=='string'||raw.password.length<12||raw.password.length>128)error('Usá una contraseña de entre 12 y 128 caracteres.',400);
  const salt=random(),hash=await passwordHash(raw.password,salt,env.ADMIN_AUTH_SECRET);
  const result=await env.DB.prepare('INSERT OR IGNORE INTO admin_credentials (email,password_hash,salt,created_at) VALUES (?,?,?,?)').bind(email,hash,salt,Date.now()).run();if(!result.meta.changes)error('Este acceso ya fue activado.',409);
  await env.DB.prepare('DELETE FROM auth_limits WHERE key=?').bind(key).run();return session(req,env,email);
 }
 if(action==='login'){
  if(typeof raw.password!=='string'||raw.password.length>128||raw.password.length<1||email.length>254)error('Correo o contraseña incorrectos.',401);
  const row=owners(env).includes(email)?await env.DB.prepare('SELECT password_hash,salt FROM admin_credentials WHERE email=?').bind(email).first():null;
  const candidate=await passwordHash(raw.password,row?.salt||'magic-owner-account-not-configured',env.ADMIN_AUTH_SECRET);
  
  if(!row||!equal(candidate,row.password_hash))error('Correo o contraseña incorrectos.',401);
  await env.DB.prepare('DELETE FROM auth_limits WHERE key=?').bind(key).run();return session(req,env,email);
 }
 return response({error:'No encontrado.'},404);
}
