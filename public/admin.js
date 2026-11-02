import {productCard} from './product-card.js';
import {applyProductOrder,moveVisibleProduct} from './product-order.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[],current=null,images=[],dirty=false,busy=false,uploading=false;
let savedOrder=[],orderRevision='',orderDirty=false,orderBusy=false,draggedId=null;
let catalogView='client';
const form=$('#product-form');
$('#admin-filter').value='available';
async function api(path,options={}){const response=await fetch('/api/admin/'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{'X-Magic-Admin':'1',...(options.body&&typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});let body;try{body=await response.json()}catch{throw new Error('El servidor no respondió. Intentá nuevamente.')}if(!response.ok){if(response.status===401)throw new Error(body.error||'Tu sesión venció. Volvé a entrar desde /admin/.');throw new Error(body.error||'No pudimos completar la operación.')}return body;}
const status=(message,error=false)=>{const el=$('#admin-status');el.textContent=message;el.classList.toggle('error',error);};
const editorStatus=message=>{$('#editor-status').textContent=message;};
function setBusy(value){busy=value;for(const el of form.querySelectorAll('button,input,select,textarea'))el.disabled=value;$('#editor-back').disabled=value;$('#save-product').textContent=value?'Guardando…':'Guardar producto ↗';}
function showDashboard(){if(busy||uploading)return;$('#admin-editor').hidden=true;$('#admin-dashboard').hidden=false;dirty=false;current=null;render();window.scrollTo({top:0,behavior:'instant'});}
function closeEditor(){if(dirty&&!confirm('Tenés cambios sin guardar. ¿Querés descartarlos?'))return;showDashboard();}
async function load(){const data=await api('products');if(!data.initialized)await api('initialize',{method:'POST'});const next=data.initialized?data:await api('products');products=next.products;orderRevision=next.orderRevision;savedOrder=products.map(p=>p.id);orderDirty=false;updateOrderControls();render();}
const activationMode=location.pathname.replace(/\/$/,'')==='/admin/activar';
let activationToken=activationMode?location.hash.slice(1):'';
try{
 if(activationMode&&activationToken){sessionStorage.setItem('magic-owner-activation',JSON.stringify({token:activationToken,expires:Date.now()+3600000}));history.replaceState({},'',location.pathname);}
 else if(activationMode){const saved=JSON.parse(sessionStorage.getItem('magic-owner-activation')||'null');if(saved?.expires>Date.now())activationToken=saved.token;}
}catch{if(activationToken)history.replaceState({},'',location.pathname);}
let setupRequired=false;
function showLogin(){
 $('#admin-login').hidden=false;$('#admin-dashboard').hidden=true;$('#admin-editor').hidden=true;
 $('#owner-access-form').hidden=false;
 $('#login-description').textContent=activationMode?'Creá la contraseña del dueño para administrar Magic iPhone.':'Entrá con el correo y la contraseña del dueño de la tienda.';
 $('#confirm-password-field').hidden=!activationMode;$('#owner-confirmation').required=activationMode;
 $('#password-helper').hidden=!activationMode;$('#activation-note').hidden=activationMode;
 $('#activation-note').classList.toggle('activation-pending',setupRequired);
 $('#activation-note').textContent=setupRequired?'La cuenta del dueño todavía no fue activada. Antes de intentar entrar, abrí el enlace privado de activación y creá una contraseña para Magic iPhone. No es la contraseña de tu correo.':'Usá la contraseña que creaste para Magic iPhone. No es la contraseña de tu correo.';
 $('#owner-password').autocomplete=activationMode?'new-password':'current-password';$('#owner-password').minLength=activationMode?12:1;
 $('#owner-access-submit').textContent=activationMode?'Crear contraseña y entrar ↗':'Entrar al panel ↗';
 if(activationMode&&!activationToken){$('#access-status').textContent='Abrí el enlace privado de activación completo. Si ya creaste tu contraseña, entrá desde /admin/.';$('#owner-access-submit').disabled=true;}
}
async function start(){
 $('#admin-retry').hidden=true;
 try{const session=await api('session');setupRequired=!!session.setupRequired;if(!session.authorized){showLogin();return;}
 await load();$('#admin-account').textContent='Sesión de '+session.email;$('#admin-login').hidden=true;$('#admin-dashboard').hidden=false;
 }catch(error){$('#login-description').textContent=error.message;$('#admin-retry').hidden=false;}
}
$('#toggle-password').onclick=()=>{const field=$('#owner-password'),show=field.type==='password';field.type=show?'text':'password';$('#toggle-password').textContent=show?'Ocultar':'Mostrar';$('#toggle-password').setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');};
$('#owner-access-form').onsubmit=async e=>{
 e.preventDefault();const accessForm=e.target;if(!accessForm.reportValidity())return;
 if(activationMode&&$('#owner-password').value!==$('#owner-confirmation').value){$('#access-status').textContent='Las contraseñas no coinciden.';return;}
 $('#owner-access-submit').disabled=true;$('#access-status').textContent='';
 try{await api(activationMode?'activate':'login',{method:'POST',body:JSON.stringify({email:$('#owner-email').value.trim().toLowerCase(),password:$('#owner-password').value,...(activationMode?{token:activationToken}:{})})});accessForm.reset();activationToken='';try{sessionStorage.removeItem('magic-owner-activation')}catch{}location.replace('/admin/');}catch(error){$('#access-status').textContent=error.message;$('#owner-access-submit').disabled=false;}
};
$('#owner-logout').onclick=async()=>{if(orderBusy)return;if((dirty||orderDirty)&&!confirm('Tenés cambios sin guardar. ¿Querés cerrar sesión y descartarlos?'))return;try{await api('logout',{method:'POST',body:'{}'});dirty=false;location.replace('/admin/');}catch(error){status(error.message,true)}};
function filteredProducts(){
 const query=$('#admin-search').value.trim().toLocaleLowerCase('es'),filter=$('#admin-filter').value,catalog=$('#admin-catalog').value;
 return products.filter(p=>(catalogView==='client'?p.available:(filter==='all'||(filter==='available'?p.available:!p.available)))&&(catalog==='all'||(catalog==='used'?p.category==='iPhone'&&p.condition==='Usado':catalog==='sealed'?p.category==='iPhone'&&p.condition==='Nuevo':p.category===catalog.slice(9)))&&[p.name,p.category,p.storage,p.color].join(' ').toLocaleLowerCase('es').includes(query));
}
function updateOrderControls(){
 $('#save-order').disabled=!orderDirty||orderBusy;$('#discard-order').disabled=!orderDirty||orderBusy;
 $('#save-order').textContent=orderBusy?'Guardando…':'Guardar orden';
 $('#order-state').textContent=orderBusy?'Guardando el orden…':orderDirty?'Cambios de orden sin guardar':'Orden guardado';
 for(const id of ['add-product','admin-refresh','admin-search','admin-filter','admin-catalog','view-client','view-manage'])$('#'+id).disabled=orderBusy;
 $('#admin-filter').disabled=orderBusy||catalogView==='client';
}
function render(){
 const catalog=$('#admin-catalog'),selected=catalog.value;
 catalog.innerHTML='<option value="all">Todos los catálogos</option><option value="used">iPhone usados</option><option value="sealed">iPhone sellados</option>'+[...new Set(products.map(p=>p.category))].map(c=>`<option value="category:${esc(c)}">${esc(c)}</option>`).join('');
 catalog.value=[...catalog.options].some(o=>o.value===selected)?selected:'all';
 const list=filteredProducts();$('#admin-count').textContent=list.length+' de '+products.length+' productos';
 const managementRows=list.map((p,i)=>`<article class="admin-product-row" data-product-id="${esc(p.id)}"><div class="product-order-controls"><span class="order-handle" role="img" draggable="false" aria-label="Arrastrar ${esc(p.name)} para cambiar su lugar" title="Arrastrar para ordenar">⠿</span><span class="order-position" aria-label="Posición ${i+1} en esta lista">${i+1}</span><div><button type="button" data-move="up" data-id="${esc(p.id)}" aria-label="Subir ${esc(p.name)}" ${i===0||orderBusy?'disabled':''}>↑</button><button type="button" data-move="down" data-id="${esc(p.id)}" aria-label="Bajar ${esc(p.name)}" ${i===list.length-1||orderBusy?'disabled':''}>↓</button></div></div><img src="${esc(p.images[0])}" alt="${esc(p.name)}" width="64" height="64" loading="lazy"><div class="admin-product-info"><h2>${esc(p.name)}</h2><p>${esc([p.category,p.storage,p.color,p.condition==='Nuevo'?'Nuevo sellado':p.condition].filter(Boolean).join(' · '))}</p><span class="stock-tag ${p.available?'':'hidden-stock'}">${p.available?'Disponible':'Oculto / agotado'}</span></div><span class="admin-price">${p.currency==='USD'?'US$':'$'} ${p.price.toLocaleString('es-AR')} <small>${p.currency}</small></span><button class="button outline" type="button" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.name)}" ${orderBusy?'disabled':''}>Editar ↗</button></article>`).join('')||'<div class="admin-empty"><h2>No hay productos para mostrar.</h2><p>Agregá un producto o cambiá los filtros.</p></div>';
 const preview= list.map((p,i)=>`<div class="admin-preview-item" data-product-id="${esc(p.id)}">${productCard(p,{newTab:true})}<div class="admin-preview-actions"><div class="product-order-controls"><span class="order-handle" role="img" draggable="false" aria-label="Arrastrar ${esc(p.name)} para cambiar su lugar" title="Arrastrar para ordenar">⠿</span><span class="order-position" aria-label="Posición ${i+1} en esta lista">${i+1}</span><div><button type="button" data-move="up" data-id="${esc(p.id)}" aria-label="Subir ${esc(p.name)}" ${i===0||orderBusy?'disabled':''}>↑</button><button type="button" data-move="down" data-id="${esc(p.id)}" aria-label="Bajar ${esc(p.name)}" ${i===list.length-1||orderBusy?'disabled':''}>↓</button></div></div><button class="preview-edit" type="button" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.name)}" ${orderBusy?'disabled':''}>Editar ↗</button></div></div>`).join('')||'<div class="admin-empty"><h2>No hay productos disponibles.</h2><p>Podés ver y editar los ocultos desde Vista de gestión.</p></div>';
 $('#admin-products').className=catalogView==='client'?'product-grid admin-client-grid':'admin-product-list';
 $('#admin-products').innerHTML=catalogView==='client'?preview:managementRows;
 $('#admin-categories').innerHTML=[...new Set(['iPhone','Samsung','iPad','MacBook','AirPods','Watch','Accesorios',...products.map(p=>p.category)])].map(c=>`<option value="${esc(c)}"></option>`).join('');
}
function setCatalogView(view){
 if(orderBusy)return;catalogView=view;$('#admin-filter').value=view==='client'?'available':'all';
 $('#view-client').setAttribute('aria-pressed',view==='client');$('#view-manage').setAttribute('aria-pressed',view==='manage');
 $('#admin-view-note').textContent=view==='client'?'Así ven los clientes las fotos, los precios y el orden del catálogo. Solo se muestran los productos disponibles.':'Gestioná todos los productos, incluidos los ocultos. Los controles de administración solo los ve el dueño.';
 updateOrderControls();render();
}
$('#view-client').onclick=()=>setCatalogView('client');$('#view-manage').onclick=()=>setCatalogView('manage');
function moveProduct(from,to){
 if(orderBusy)return;const next=moveVisibleProduct(products,filteredProducts().map(p=>p.id),from,to);if(next===products)return;
 products=next;orderDirty=products.some((p,i)=>p.id!==savedOrder[i]);updateOrderControls();render();
 const button=[...$('#admin-products').querySelectorAll('[data-move]')].find(b=>b.dataset.id===from&&!b.disabled);button?.focus({preventScroll:true});
}
function canEdit(){if(orderBusy)return false;if(orderDirty){status('Guardá o descartá los cambios de orden antes de editar productos.',true);$('#save-order').focus();return false;}return true;}
$('#save-order').onclick=async()=>{
 if(orderBusy||!orderDirty)return;orderBusy=true;updateOrderControls();render();
 try{const result=await api('products/order',{method:'PUT',body:JSON.stringify({ids:products.map(p=>p.id),revision:orderRevision})});products=result.products;orderRevision=result.orderRevision;savedOrder=products.map(p=>p.id);orderDirty=false;status('Orden guardado. Ya se aplica en los catálogos y en los destacados del inicio.');}
 catch(error){status(error.message,true);}finally{orderBusy=false;updateOrderControls();render();}
};
$('#discard-order').onclick=()=>{if(orderBusy)return;products=applyProductOrder(products,savedOrder);orderDirty=false;updateOrderControls();render();status('Se restauró el último orden guardado.');};
const productList=$('#admin-products');
function clearDrag(){draggedId=null;for(const row of productList.querySelectorAll('.is-dragging,.drop-target'))row.classList.remove('is-dragging','drop-target');}
productList.addEventListener('pointerdown',e=>{const handle=e.target.closest('.order-handle');if(!handle||orderBusy||e.button!==0)return;e.preventDefault();draggedId=handle.closest('[data-product-id]').dataset.productId;handle.setPointerCapture(e.pointerId);handle.closest('[data-product-id]').classList.add('is-dragging');});
productList.addEventListener('pointermove',e=>{if(!draggedId)return;e.preventDefault();const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-product-id]');for(const el of productList.querySelectorAll('.drop-target'))el.classList.remove('drop-target');if(row&&row.dataset.productId!==draggedId)row.classList.add('drop-target');if(e.clientY>window.innerHeight-55)window.scrollBy(0,18);else if(e.clientY<55)window.scrollBy(0,-18);});
productList.addEventListener('pointerup',e=>{if(!draggedId)return;const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-product-id]'),from=draggedId;clearDrag();if(row)moveProduct(from,row.dataset.productId);});
productList.addEventListener('pointercancel',clearDrag);
productList.addEventListener('lostpointercapture',clearDrag);
function renderPhotos(){$('#editor-photos').innerHTML=images.map((url,i)=>`<div class="editor-photo"><img src="${esc(url)}" alt="Foto ${i+1} del producto"><div>${i===0?'<strong>Foto principal</strong>':`<button type="button" data-cover="${i}">Principal</button>`}<button type="button" data-remove-photo="${i}" aria-label="Quitar foto ${i+1}">Quitar</button></div></div>`).join('');}
function edit(product=null){current=product?structuredClone(product):null;images=product?[...product.images]:[];form.reset();for(const key of ['name','category','storage','color','price','currency','condition','description'])form.elements[key].value=product?.[key]??({currency:'USD',condition:'Nuevo'}[key]||'');form.elements.available.checked=product?.available??true;$('#editor-title').textContent=product?'Editar '+product.name:'Agregar producto';$('#delete-product').hidden=!product;$('#admin-dashboard').hidden=true;$('#admin-editor').hidden=false;$('#upload-progress').textContent='';editorStatus('');dirty=false;renderPhotos();window.scrollTo({top:0,behavior:'instant'});form.elements.name.focus({preventScroll:true});}
$('#add-product').onclick=()=>{if(canEdit())edit();};$('#admin-products').addEventListener('click',e=>{const button=e.target.closest('[data-edit]');if(button&&canEdit())edit(products.find(p=>String(p.id)===button.dataset.edit));const move=e.target.closest('[data-move]');if(move){const list=filteredProducts(),index=list.findIndex(p=>p.id===move.dataset.id),target=list[index+(move.dataset.move==='up'?-1:1)];if(target)moveProduct(move.dataset.id,target.id);}});$('#admin-search').oninput=render;$('#admin-filter').onchange=render;$('#admin-catalog').onchange=render;$('#admin-refresh').onclick=async()=>{if(orderBusy||orderDirty&&!confirm('Tenés cambios de orden sin guardar. ¿Querés descartarlos y actualizar?'))return;try{await load();status('Catálogo actualizado.')}catch(error){status(error.message,true)}};
$('#editor-back').onclick=closeEditor;$('#cancel-editor').onclick=closeEditor;$('#admin-retry').onclick=start;
form.addEventListener('input',()=>dirty=true);
$('#editor-photos').addEventListener('click',e=>{if(busy||uploading)return;const remove=e.target.closest('[data-remove-photo]'),cover=e.target.closest('[data-cover]');if(remove)images.splice(Number(remove.dataset.removePhoto),1);if(cover){const [photo]=images.splice(Number(cover.dataset.cover),1);images.unshift(photo);}if(remove||cover){dirty=true;renderPhotos();}});
$('#photo-upload').onchange=async e=>{
 const files=[...e.target.files];if(!files.length)return;if(images.length+files.length>5){editorStatus('Podés guardar hasta cinco fotos por producto.');e.target.value='';return;}
 if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)){editorStatus('Elegí fotos JPG, PNG o WebP de hasta 8 MB cada una.');e.target.value='';return;}
 uploading=true;$('#save-product').disabled=true;$('#delete-product').disabled=true;e.target.disabled=true;editorStatus('');
 try{for(let i=0;i<files.length;i++){$('#upload-progress').textContent='Subiendo foto '+(i+1)+' de '+files.length+'…';const result=await api('upload',{method:'POST',headers:{'Content-Type':files[i].type},body:files[i]});images.push(result.url);dirty=true;renderPhotos();}$('#upload-progress').textContent='Fotos subidas. Guardá el producto para publicarlas.';}catch(error){editorStatus(error.message);$('#upload-progress').textContent='';}finally{uploading=false;$('#save-product').disabled=false;$('#delete-product').disabled=false;e.target.disabled=false;e.target.value='';}
};
form.onsubmit=async e=>{e.preventDefault();if(busy||uploading||!form.reportValidity())return;if(!images.length){editorStatus('Subí al menos una foto del producto.');return;}const data=Object.fromEntries(new FormData(form));const payload={name:data.name,category:data.category,storage:data.storage,color:data.color,price:Number(data.price),currency:data.currency,condition:data.condition,description:data.description,available:form.elements.available.checked,images,version:current?.version};setBusy(true);editorStatus('');try{const result=await api(current?'products/'+encodeURIComponent(current.id):'products',{method:current?'PUT':'POST',body:JSON.stringify(payload)});const index=products.findIndex(p=>p.id===result.product.id);if(index<0)products.push(result.product);else products[index]=result.product;dirty=false;setBusy(false);showDashboard();status(result.product.available?'Producto guardado y publicado en la tienda.':'Producto guardado. Permanece oculto en la tienda.');}catch(error){setBusy(false);editorStatus(error.message);}};
$('#delete-product').onclick=async()=>{if(!current||busy||uploading||!confirm('¿Eliminar “'+current.name+'” del catálogo? Dejará de aparecer en la tienda y en el cotizador.'))return;setBusy(true);editorStatus('');try{await api('products/'+encodeURIComponent(current.id),{method:'DELETE',body:JSON.stringify({version:current.version})});products=products.filter(p=>p.id!==current.id);dirty=false;setBusy(false);showDashboard();status('Producto eliminado del catálogo.');}catch(error){setBusy(false);editorStatus(error.message);}};
window.addEventListener('beforeunload',e=>{if(dirty||uploading||orderDirty||orderBusy){e.preventDefault();e.returnValue='';}});
start();
