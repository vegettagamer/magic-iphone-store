import assert from 'node:assert/strict';
import {proxy} from './worker.js';
const original='https://original.example',legacy='https://legacy.example',publicOrigin='https://tienda.example';
const env={UPSTREAM_ORIGIN:original,UPSTREAM_ALIASES:legacy};
let forwarded;
const upstream=async req=>{forwarded=req;return new Response(JSON.stringify({photo:'/media/phone.webp',link:original+'/producto/phone/',old:legacy+'/'}),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=100','ETag':'old','Content-Length':'99'}})};
const content=await proxy(new Request(publicOrigin+'/api/products?test=1'),env,upstream);
assert.equal(forwarded.url,original+'/api/products?test=1');assert.equal(content.headers.get('Cache-Control'),'no-store');assert.equal(content.headers.get('ETag'),null);assert.equal(content.headers.get('Content-Length'),null);
const data=await content.json();assert.equal(data.link,publicOrigin+'/producto/phone/');assert.equal(data.old,publicOrigin+'/');assert.equal(data.photo,'/media/phone.webp');
let calls=0;const notAllowed=await proxy(new Request(publicOrigin+'/api/admin/products',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}),env,async()=>{calls++;return new Response()});assert.equal(notAllowed.status,403);assert.equal(calls,0);
assert.equal((await proxy(new Request(publicOrigin+'/api/admin/products',{method:'POST',body:'{}'}),env,upstream)).status,403);
const owner=await proxy(new Request(publicOrigin+'/api/admin/login',{method:'POST',headers:{Origin:publicOrigin,'X-Magic-Admin':'1','Content-Type':'application/json',Cookie:'analytics=unrelated; __Host-magic_owner=owner-token',Referer:publicOrigin+'/admin/',Authorization:'Bearer unrelated'},body:'{"email":"owner@example.com","password":"fixture-only"}'}),env,async req=>{
 assert.equal(req.headers.get('Origin'),original);assert.equal(req.headers.get('X-Magic-Admin'),'1');assert.equal(req.headers.get('Cookie'),'__Host-magic_owner=owner-token');assert.equal(req.headers.get('Referer'),original+'/admin/');assert.equal(req.headers.get('Authorization'),null);assert.equal((await req.json()).password,'fixture-only');
 const h=new Headers({'Content-Type':'application/json'});h.append('Set-Cookie','__Host-magic_owner=new-token; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=604800');h.append('Set-Cookie','unrelated-cookie=value; Path=/');return new Response('{"ok":true}',{headers:h});
});
const cookie=owner.headers.get('Set-Cookie');assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('SameSite=Strict'));assert.ok(cookie.includes('Secure'));assert.ok(!cookie.includes('unrelated-cookie'));assert.ok(!cookie.includes('Domain='));
const uploadBytes=new Uint8Array([137,80,78,71,13,10,26,10,0,255]);
const uploaded=await proxy(new Request(publicOrigin+'/api/admin/upload',{method:'POST',headers:{Origin:publicOrigin,'X-Magic-Admin':'1','Content-Type':'image/png'},body:uploadBytes}),env,async req=>{assert.equal(req.headers.get('Content-Type'),'image/png');assert.deepEqual(new Uint8Array(await req.arrayBuffer()),uploadBytes);return new Response('{"url":"/media/new.png"}',{status:201,headers:{'Content-Type':'application/json'}})});assert.equal(uploaded.status,201);
const redirect=await proxy(new Request(publicOrigin+'/catalogo/'),env,async()=>new Response(null,{status:302,headers:{Location:original+'/catalogo'}}));assert.equal(redirect.headers.get('Location'),publicOrigin+'/catalogo');
const bytes=new Uint8Array([0,255,34,11,0,87]);const image=await proxy(new Request(publicOrigin+'/media/test.webp'),env,async()=>new Response(bytes,{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000'}}));assert.deepEqual(new Uint8Array(await image.arrayBuffer()),bytes);
assert.equal((await proxy(new Request(publicOrigin+'/'),{},upstream)).status,503);
assert.equal((await proxy(new Request(publicOrigin+'//evil.example/path'),env,upstream)).status,400);
assert.equal((await proxy(new Request(publicOrigin+'/'),env,async()=>{throw new Error('private upstream detail')})).status,502);
console.log('PASS: same-store routes and data, masked links, cross-site writes denied, private owner session preserved, upload bodies forwarded, safe cookies, redirects, binary photos, no stale API cache and safe errors.');

const mapped=await proxy(new Request(publicOrigin+'/'),{...env,ORIGIN_REWRITES:JSON.stringify({'https://old-shop.example':'https://shop.example'})},async()=>new Response('<a href="https://old-shop.example/">Tienda</a><a href="https://wa.me/123">WhatsApp</a>',{headers:{'Content-Type':'text/html'}}));
const mappedHTML=await mapped.text();assert.ok(mappedHTML.includes('href="https://shop.example/"'));assert.ok(mappedHTML.includes('https://wa.me/123'));assert.ok(!mappedHTML.includes('old-shop.example'));console.log('PASS: el panel conserva WhatsApp y abre la tienda por su enlace alternativo.');
