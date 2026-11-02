const $=s=>document.querySelector(s);
async function api(path,options={}){const response=await fetch('/api/admin/'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{'X-Magic-Admin':'1',...(options.body&&typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});let body;try{body=await response.json()}catch{throw new Error('El servidor no respondió. Intentá nuevamente.')}if(!response.ok){if(response.status===401)throw new Error(body.error||'Tu sesión venció. Volvé a entrar desde /admin/.');throw new Error(body.error||'No pudimos completar la operación.')}return body;}
const activationMode=location.pathname.replace(/\/$/,'')==='/admin/activar';
let activationToken=activationMode?location.hash.slice(1):'';
try{
 if(activationMode&&activationToken){sessionStorage.setItem('magic-owner-activation',JSON.stringify({token:activationToken,expires:Date.now()+3600000}));history.replaceState({},'',location.pathname);}
 else if(activationMode){const saved=JSON.parse(sessionStorage.getItem('magic-owner-activation')||'null');if(saved?.expires>Date.now())activationToken=saved.token;}
}catch{if(activationToken)history.replaceState({},'',location.pathname);}
let setupRequired=false;
function showLogin(){
 $('#admin-login').hidden=false;
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
 location.replace('/admin/');
 }catch(error){$('#login-description').textContent=error.message;$('#admin-retry').hidden=false;}
}
$('#toggle-password').onclick=()=>{const field=$('#owner-password'),show=field.type==='password';field.type=show?'text':'password';$('#toggle-password').textContent=show?'Ocultar':'Mostrar';$('#toggle-password').setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');};
$('#owner-access-form').onsubmit=async e=>{
 e.preventDefault();const accessForm=e.target;if(!accessForm.reportValidity())return;
 if(activationMode&&$('#owner-password').value!==$('#owner-confirmation').value){$('#access-status').textContent='Las contraseñas no coinciden.';return;}
 $('#owner-access-submit').disabled=true;$('#access-status').textContent='';
 try{await api(activationMode?'activate':'login',{method:'POST',body:JSON.stringify({email:$('#owner-email').value.trim().toLowerCase(),password:$('#owner-password').value,...(activationMode?{token:activationToken}:{})})});accessForm.reset();activationToken='';try{sessionStorage.removeItem('magic-owner-activation')}catch{}location.replace('/admin/');}catch(error){$('#access-status').textContent=error.message;$('#owner-access-submit').disabled=false;}
};

$('#admin-retry').onclick=start;
start();
