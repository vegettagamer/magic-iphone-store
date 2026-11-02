import {productCard} from '/product-card.js';
import {catalogState,catalogMatches} from '/catalog-filters.js';
import {whatsappURL,contactIcon,initSalesFollow} from '/contact.js';
import {mountTradeIn} from '/trade-in-ui.js';
const instagram='https://www.instagram.com/magiciphone.ros/';
let products=[];
let catalogError=false;
try{const response=await fetch('/api/products',{cache:'no-store'});if(!response.ok)throw new Error('Catálogo no disponible');products=(await response.json()).products;}catch{catalogError=true;}
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>n.toLocaleString('es-AR');const money=p=>`${p.currency==='USD'?'US$ ':'$ '}${number(p.price)}`;const priceHTML=p=>`${money(p)}<small>${p.currency==='USD'?'USD':'ARS'}</small>`;
const slug = p => p.slug;
const productURL = p => '/producto/' + p.slug + '/';
const photos = p => p.images || [];
const photoScale=p=>Math.min(2,p.photoScale||1);
function art(p,hero=false){return `<img style="--photo-scale:${photoScale(p)}" src="${safe(photos(p)[0]||'')}" alt="${safe(p.name + (p.color?' en '+p.color:''))}" width="800" height="800" ${hero?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;}
$('#hero-device').innerHTML='<img src="/images/iphone-18-pro-bordo-hero-recorte.png" alt="iPhone 18 Pro bordó Cherry, vista de frente y dorso" width="1200" height="900" fetchpriority="high" decoding="async">';$('#trade-device').innerHTML='<img src="/images/iphone-13-pro-verde-recorte.png" alt="iPhone 13 Pro verde" width="1254" height="1254" loading="lazy" decoding="async">';$('#year').textContent=new Date().getFullYear();
let category='Todos',condition='Todos',expanded=true;
const categories=['Todos',...new Set(products.map(p=>p.category))];
$('.tabs').innerHTML=categories.filter(c=>c!=='iPhone').map(c=>`<button data-category="${safe(c)}" class="${c==='Todos'?'selected':''}" aria-pressed="${c==='Todos'}">${safe(c)}</button>`).join('');
function render(){let list=products.filter(p=>catalogMatches(p,category,condition)&&`${p.name} ${p.storage} ${p.color}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes($('#search').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')));const sort=$('#sort').value;if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));if(sort==='low'||sort==='high')list.sort((a,b)=>a.currency!==b.currency?(a.currency==='ARS'?1:-1):(sort==='low'?a.price-b.price:b.price-a.price));$('#result-count').textContent=`${list.length} productos`;const limited=!expanded&&category==='Todos'&&!$('#search').value&&condition==='Todos';const visible=limited?list.slice(0,8):list;$('#show-more').hidden=!limited||list.length<=8;$('#products').innerHTML=visible.map(productCard).join('')||(category==='iPhone'&&condition==='Nuevo'?'<div class="empty-state"><h3>No hay iPhone sellados publicados.</h3><p>No hay equipos sellados publicados con estos filtros. Consultanos disponibilidad.</p><a class="button outline" href="/contacto/" data-nav>Consultar disponibilidad ↗</a></div>':'<div class="empty-state"><h3>No encontramos ese equipo.</h3><p>Probá otra búsqueda o consultanos disponibilidad.</p></div>');}
$$('[data-category]').forEach(b=>b.onclick=()=>{navigate('/catalogo/'+(b.dataset.category==='Todos'?'':'?categoria='+encodeURIComponent(b.dataset.category)));});$$('[data-condition]').forEach(b=>b.onclick=()=>{condition=b.dataset.condition;$$('[data-condition]').forEach(x=>x.classList.toggle('selected',x===b));render()});$('#search').oninput=render;$('#sort').onchange=render;$('#show-more').onclick=()=>{expanded=true;render()};
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200)}
function productInquiryURL(p){return whatsappURL(`¡Hola Magic iPhone! Me interesa ${[p.name,p.storage,p.color].filter(Boolean).join(' · ')}.\nPrecio publicado: ${money(p)} ${p.currency}.\n¿Me confirman disponibilidad y formas de pago?`)}
document.addEventListener('click',e=>{const d=e.target.closest('[data-detail]');if(d&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();{const p=products.find(p=>String(p.id)===d.dataset.detail);if(p)navigate(productURL(p));}}});
const homeTitle='Magic iPhone — Un upgrade a tu mundo.';
let activeProduct=null;
let catalogScroll=0;
if ('scrollRestoration' in history) history.scrollRestoration='manual';
const conditionLabel=p=>p.condition==='Nuevo'?'Nuevo sellado':p.condition==='Usado'?'Usado':'Estado a confirmar';
const descriptions={iPhone:'Tu próximo iPhone, con el modelo, la capacidad y el color que elegiste. Hablemos para conocer todos los detalles del equipo.',Samsung:'Encontrá tu próxima conexión con Samsung Galaxy. Consultanos los detalles del modelo y coordiná tu compra con atención personal.',iPad:'Un iPad para acompañar tus ideas, tu trabajo y tu día a día. Esta es la configuración publicada en nuestro catálogo.',MacBook:'Tu próximo espacio de trabajo, donde quieras. Explorá esta configuración de MacBook y consultanos para dar el próximo paso.',AirPods:'Tu música, tus llamadas y tus momentos favoritos. Conocé esta opción de AirPods y consultanos disponibilidad.',Watch:'Tecnología para acompañarte todos los días, desde tu muñeca. Consultanos las terminaciones y correas disponibles.',Accesorios:'Completá tu experiencia con el accesorio que buscás. Antes de comprar, confirmá con nosotros la compatibilidad con tu equipo.'};
function productPage(p){
 const photoList=photos(p);const sameModel=products.filter(x=>x.name===p.name);const related=products.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,4);
 return `<div class="product-shell section"><nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="/" data-nav>Inicio</a><span>/</span><a href="/catalogo/" data-nav>Catálogo</a><span>/</span><span>${safe(p.name)}</span></nav><a href="/catalogo/" data-nav class="back-to-catalog">← Volver al catálogo</a><section class="product-layout" aria-labelledby="product-title"><div class="product-gallery"><div class="main-photo"><span class="photo-category">${safe(p.category)} / MAGIC IPHONE</span><img id="main-product-photo" style="--photo-scale:${photoScale(p)}" src="${safe(photoList[0])}" alt="${safe(p.name+(p.color?' · '+p.color:''))}" width="1000" height="1000" fetchpriority="high"><span class="photo-caption">FOTO DE CATÁLOGO · ${p.condition==='Usado'?'CONSULTÁ FOTOS DE LA UNIDAD':'IMAGEN DEL MODELO'}</span></div>${photoList.length>1?`<div class="photo-thumbnails" role="group" aria-label="Fotos del producto">${photoList.map((src,i)=>`<button data-photo="${i}" class="${i===0?'selected':''}" aria-label="Ver foto ${i+1} de ${safe(p.name)}" aria-pressed="${i===0}"><img style="--photo-scale:${photoScale(p)}" src="${safe(src)}" alt="Vista ${i+1}" width="100" height="100"></button>`).join('')}</div>`:''}</div><div class="product-purchase"><div class="product-page-eyebrow"><span class="live-dot"></span> TU PRÓXIMA CONEXIÓN</div><h1 id="product-title">${safe(p.name)}</h1><p class="product-subtitle">${safe([p.storage,p.color].filter(Boolean).join(' · ')||p.category)}</p><span class="condition-pill ${p.condition==='Usado'?'used':''}">${conditionLabel(p)}</span><div class="product-page-price">${money(p)}<small>${p.currency==='USD'?'DÓLARES ESTADOUNIDENSES':'PESOS ARGENTINOS'}</small></div><p class="product-description">${safe(p.description||descriptions[p.category]||'Consultanos los detalles y la disponibilidad de este producto.')}</p><dl class="product-specifications"><div><dt>Modelo</dt><dd>${safe(p.name)}</dd></div>${p.storage?`<div><dt>${p.storage.includes('RAM')?'Configuración':'Capacidad / tamaño'}</dt><dd>${safe(p.storage)}</dd></div>`:''}${p.color?`<div><dt>Color</dt><dd>${safe(p.color)}</dd></div>`:''}<div><dt>Condición</dt><dd>${conditionLabel(p)}</dd></div></dl>${sameModel.length>1?`<div class="model-options"><span>Elegí tu configuración</span><div>${sameModel.map(x=>`<a href="${productURL(x)}" data-detail="${x.id}" class="${x.id===p.id?'selected':''}" ${x.id===p.id?'aria-current="page"':''}>${safe(x.storage)}</a>`).join('')}</div></div>`:''}<a class="button dark purchase-whatsapp" href="${productInquiryURL(p)}" target="_blank" rel="noopener"><span class="contact-cta-label">${contactIcon('whatsapp')} Consultar por WhatsApp</span><span>↗</span></a><a class="button outline purchase-inquiry" href="${instagram}" target="_blank" rel="noopener">Consultar por Instagram <span>↗</span></a><div class="product-service-note"><span>${contactIcon('chat-dots')}</span><p>Confirmamos stock, formas de pago y entrega de manera personal.</p></div><button class="share-product" data-share="${p.id}">↗ Compartir este producto</button></div></section><section class="product-info-section"><div><div class="eyebrow">ANTES DE TU PRÓXIMO UPGRADE</div><h2>Todos los detalles,<br>sin vueltas.</h2></div><div><details open><summary>Sobre este equipo <span>+</span></summary><p>${p.condition==='Usado'?'Este iPhone se ofrece usado. Pedinos fotos actuales de la unidad y detalles sobre batería, funcionamiento, estado estético y accesorios antes de confirmar tu compra.':p.condition==='Nuevo'?'Este producto figura como nuevo sellado en nuestro catálogo. Consultanos disponibilidad y los detalles de la presentación antes de comprar.':'Consultanos el estado, la presentación y la disponibilidad de esta configuración antes de confirmar la compra.'}</p></details><details><summary>Precio, pago y entrega <span>+</span></summary><p>El precio publicado es ${money(p)} ${p.currency}. ${p.currency==='USD'?'Si querés abonar en pesos, consultanos la cotización aplicable. ':''}Los medios de pago, la entrega y las condiciones de garantía se coordinan directamente con Magic iPhone.</p></details><details><summary>Sobre las fotos <span>+</span></summary><p>Las fotos de catálogo muestran el diseño del modelo. ${p.color?'El color publicado para este equipo es '+safe(p.color)+'. ':'Consultanos los colores y terminaciones disponibles. '}Las imágenes no documentan el estado de una unidad usada. ${p.category==='Watch'?'La correa disponible se confirma al consultar. ':''}${p.category==='Accesorios'?'Confirmá la compatibilidad con tu modelo de equipo. ':''}${p.photoNote?safe(p.photoNote):''}</p><a class="photo-source" href="${safe(p.photoSource||instagram)}" target="_blank" rel="noopener">Fuente de la foto ↗</a></details></div></section>${related.length?`<section class="related-products"><div class="section-heading"><div><div class="eyebrow">SEGUÍ EXPLORANDO</div><h2>También te pueden <span>conectar.</span></h2></div><a href="/catalogo/" data-nav class="text-link">Ver catálogo completo ↗</a></div><div class="product-grid">${related.map(productCard).join('')}</div></section>`:''}</div><section class="social-banner"><div><span>✳</span><h2>Tu próximo upgrade, con nosotros.</h2></div><a href="${instagram}" target="_blank" rel="noopener">@magiciphone.ros <span>↗</span></a></section>`;
}
const pageRoutes={
 '/':{id:'home-view',title:homeTitle},
 '/catalogo/':{id:'catalog-view',title:'Catálogo | Magic iPhone'},
 '/catalogo/iphone-usados/':{id:'catalog-view',title:'iPhone usados | Magic iPhone'},
 '/catalogo/iphone-sellados/':{id:'catalog-view',title:'iPhone sellados | Magic iPhone'},
 '/vende-tu-equipo/':{id:'sell-view',title:'Vendé tu equipo · Cotizador de iPhone | Magic iPhone'},
 '/preguntas-frecuentes/':{id:'faq-view',title:'Preguntas frecuentes | Magic iPhone'},
 '/contacto/':{id:'contact-view',title:'Contacto | Magic iPhone'}
};
const oldSections={'#catalogo':'/catalogo/','#renova':'/vende-tu-equipo/','#preguntas':'/preguntas-frecuentes/'};
function route(){
 if(location.pathname.replace(/\/?$/,'/')==='/mi-seleccion/')history.replaceState({},'','/catalogo/');
 if(location.pathname==='/'&&oldSections[location.hash])history.replaceState({},'',oldSections[location.hash]);
 const path=location.pathname.replace(/\/?$/,'/');
 const match=path.match(/^\/producto\/([^/]+)\/$/);const p=match?products.find(x=>slug(x)===match[1]):null;activeProduct=p||null;
 const page=pageRoutes[path];const target=page?.id||'product-page';
 $$('main').forEach(el=>el.hidden=el.id!==target);
 document.documentElement.classList.toggle('product-mode',!!match);document.documentElement.classList.toggle('inner-page',path!=='/');
 if(page?.id==='catalog-view'){
  const state=catalogState(path,location.search);category=state.mode!=='all'?'iPhone':categories.includes(state.category)?state.category:'Todos';condition=state.condition;
  $('#catalog-title').textContent=state.title;$('#catalog-view .section-heading>p').textContent=state.description;
  $('.condition-filters').hidden=state.mode!=='all';
  $$('[data-category]').forEach(x=>{x.classList.toggle('selected',x.dataset.category===category);x.setAttribute('aria-pressed',String(x.dataset.category===category));});
  $$('[data-condition]').forEach(x=>x.classList.toggle('selected',x.dataset.condition===condition));
  $$('.iphone-catalog-links a').forEach(x=>{const selected=new URL(x.href).pathname===path;x.classList.toggle('selected',selected);if(selected)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});
  render();
 }
 if(page)document.title=page.title;
 else {$('#product-page').innerHTML=p?productPage(p):'<section class="section missing-product"><h1>No encontramos esta página.</h1><p>Podés seguir explorando Magic iPhone.</p><a class="button dark" href="/catalogo/" data-nav>Ver el catálogo →</a></section>';document.title=p?`${p.name} ${p.storage} | Magic iPhone`:'Página no encontrada | Magic iPhone';}
 $$('.header nav a,.mobile-nav a').forEach(a=>{const selected=new URL(a.href).pathname===(match||path.startsWith('/catalogo/')?'/catalogo/':path);a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 let canonical=$('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical)}canonical.href=location.origin+path;
 return document.getElementById(target);
}
function navigate(url){
 if(location.pathname==='/catalogo/')catalogScroll=window.scrollY;
 const targetURL=new URL(url,location.origin);history.replaceState({scroll:window.scrollY},'');history.pushState({},'',targetURL.pathname+targetURL.search+targetURL.hash);const target=route();
 requestAnimationFrame(()=>{const anchor=targetURL.hash&&document.getElementById(targetURL.hash.slice(1));if(anchor)anchor.scrollIntoView({behavior:'instant'});else window.scrollTo({top:0,behavior:'instant'});target?.focus({preventScroll:true});window.dispatchEvent(new Event('magic:navigation'))});
}
document.addEventListener('click',e=>{
 const link=e.target.closest('[data-nav]');if(link&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();navigate(link.href);}
 const thumb=e.target.closest('[data-photo]');if(thumb&&activeProduct){const i=Number(thumb.dataset.photo);$('#main-product-photo').src=photos(activeProduct)[i];$$('[data-photo]').forEach(b=>{b.classList.toggle('selected',b===thumb);b.setAttribute('aria-pressed',b===thumb)});}
 const share=e.target.closest('[data-share]');if(share)copyLink(products.find(p=>String(p.id)===share.dataset.share));
});
async function copyLink(p){if(!p)return;try{await navigator.clipboard.writeText(new URL(productURL(p),location.origin).href);toast('Enlace del producto copiado. Ya podés compartirlo.')}catch{toast('Podés copiar el enlace desde la barra de direcciones.')}}
window.addEventListener('popstate',e=>{route();requestAnimationFrame(()=>(window.scrollTo({top:e.state?.scroll??(location.pathname==='/catalogo/'?catalogScroll:0),behavior:'instant'}),window.dispatchEvent(new Event('magic:navigation'))))});
const highlights=products.slice(0,4);
$('#home-featured').innerHTML=highlights.map(productCard).join('');
if(catalogError){const notice=document.createElement('div');notice.className='catalog-load-error';notice.setAttribute('role','alert');notice.innerHTML='No pudimos cargar el catálogo. <a href="" onclick="location.reload();return false">Volver a intentar</a> o <a href="/contacto/">consultanos</a>.';$('.header').after(notice);}
render();route();initSalesFollow();
mountTradeIn($('#trade-in-calculator'),{instagram,products,productURL,productPhoto:p=>photos(p)[0]}).catch(()=>{$('#trade-in-calculator').innerHTML='<p class="calculator-error">No pudimos cargar el cotizador. <a href="https://www.instagram.com/magiciphone.ros/" target="_blank" rel="noopener">Consultanos por Instagram ↗</a></p>'});
