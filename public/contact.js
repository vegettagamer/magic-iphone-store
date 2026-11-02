export const salesNumber='5493382406311';
export const whatsappURL=message=>`https://wa.me/${salesNumber}?text=${encodeURIComponent(message)}`;
export const contactIcon=name=>`<svg class="message-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/icons/contact-icons.svg#${name}"></use></svg>`;

export function initSalesFollow(){
 const button=document.getElementById('whatsapp-sales');if(!button)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let y=0,frame=0;
 const target=()=>{const mobile=innerWidth<=700;const travel=mobile?50:85;const progress=Math.min(1,Math.max(0,scrollY)/Math.max(1,innerHeight));return Math.max(8,scrollY+innerHeight-button.offsetHeight-(mobile?18:26)-travel*(1-progress))};
 const paint=()=>button.style.setProperty('--sales-y',`${y.toFixed(2)}px`);
 function step(){
  frame=0;const destination=target();let delta=destination-y;
  // Keep the contact within reach even when a page jump moves a long distance.
  if(reduced.matches||Math.abs(delta)>innerHeight*.6){y=destination;paint();return;}
  y+=delta*.16;paint();
  if(Math.abs(destination-y)>.4)frame=requestAnimationFrame(step);else{y=destination;paint();}
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(step)};
 const snap=()=>{if(frame)cancelAnimationFrame(frame);frame=0;y=target();paint()};
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',snap,{passive:true});
 addEventListener('pageshow',snap);addEventListener('magic:navigation',snap);
 reduced.addEventListener('change',snap);snap();
}
