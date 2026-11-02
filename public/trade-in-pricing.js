export const tradeConditions = [
 {id:'sealed',label:'Nuevo sellado',detail:'Sin abrir; requiere evaluación personal.'},
 {id:'excellent',label:'Excelente',detail:'Sin marcas visibles; el resto funciona.'},
 {id:'very-good',label:'Muy bueno',detail:'Marcas mínimas de uso; el resto funciona.'},
 {id:'details',label:'Con detalles estéticos',detail:'Rayones o desgaste, sin roturas ni fallas.'},
 {id:'damaged',label:'Dañado / para reparar',detail:'Roturas, golpes importantes u otras fallas.'}

];
export const capacityLabel = n => n>=1024 ? `${n/1024} TB` : `${n} GB`;
export const batteryOptions=[
 {id:'90-plus',label:'90% o más',min:90,max:100},
 {id:'83-89',label:'Entre 83% y 89%',min:83,max:89},
 {id:'70-82',label:'Entre 70% y 82%',min:70,max:82},
 {id:'under-70',label:'Menos del 70%',min:1,max:69},
 {id:'replaced',label:'Batería cambiada · S/CONDICIÓN',kind:'unconditioned'},
 {id:'not-working',label:'La batería no funciona · S/CONDICIÓN',kind:'unconditioned'},
 {id:'unknown',label:'No lo sé',min:70,max:100}
];
export const batteryLabel=value=>batteryOptions.find(option=>option.id===String(value))?.label||`${value}%`;

export function estimateUpgrade(quote,product,exchangeRate){
 if(!product)return {status:'choose'};
 if(!Number.isFinite(product.price)||product.price<=0||!['USD','ARS'].includes(product.currency))return {status:'unavailable'};
 if(quote.status!=='estimated')return {status:quote.status==='manual'?'manual':'incomplete'};
 const rate=product.currency==='USD'?1:Number(exchangeRate);
 if(!Number.isFinite(rate)||rate<=0)return {status:'exchange-required'};
 if(!Number.isFinite(quote.low)||!Number.isFinite(quote.high)||quote.low<0||quote.high<quote.low)return {status:'unavailable'};
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const creditLow=round(quote.low*rate),creditHigh=round(quote.high*rate);
 return {status:'estimated',currency:product.currency,price:product.price,creditLow,creditHigh,payLow:round(Math.max(0,product.price-creditHigh)),payHigh:round(Math.max(0,product.price-creditLow)),surplusLow:round(Math.max(0,creditLow-product.price)),surplusHigh:round(Math.max(0,creditHigh-product.price)),exchangeRate:product.currency==='ARS'?rate:null};
}

/** Owner-provided intake table. Only exact model/capacity/battery entries are used. */
export function estimateTradeIn(data,input){
 if(input.model==='iPhone Duo')return {status:'manual',message:'Este modelo no se recibe como parte de pago.'};
 const model=data.models.find(m=>m.name===input.model),storage=Number(input.storage);
 const option=batteryOptions.find(b=>b.id===String(input.battery));
 const numeric=option?null:Number(input.battery),range=option||{min:numeric,max:numeric};
 if(!model||!input.storage||!input.condition||!input.functionality||!input.parts||(!input.battery&&input.battery!==0))return {status:'incomplete',message:'Completá modelo, capacidad, estado y batería para conocer la estimación.'};
 if(!model.capacities.includes(storage)||!tradeConditions.some(c=>c.id===input.condition)||!['working','faults','off'].includes(input.functionality)||!['original','replaced','unknown'].includes(input.parts)||numeric!==null&&(!Number.isInteger(numeric)||numeric<1||numeric>100))return {status:'incomplete',message:'Revisá el modelo, la capacidad, el estado y el tramo de batería.'};
 const manual=message=>({status:'manual',message});
 if(input.condition==='damaged'||input.functionality!=='working')return manual('Las fallas y roturas requieren una revisión personal antes de confirmar la toma.');
 if(input.condition==='sealed')return manual('Los equipos nuevos sellados se cotizan personalmente; esta tabla corresponde a referencias de equipos usados.');
 if(input.parts!=='original')return manual('Necesitamos revisar las piezas reemplazadas o el historial del equipo antes de cotizarlo.');
 if(input.condition==='details')return manual('La tabla no especifica un ajuste confirmado para detalles estéticos. Coordinamos una evaluación personal.');
 if(option?.kind==='unconditioned'){
  const ref=model.references.find(r=>r.storageGB===storage&&r.condition==='bateria_cambiada_o_sin_funcionar'&&r.usd>0);
  if(!ref)return manual('La tabla no incluye un valor S/CONDICIÓN para este modelo y capacidad. Coordinamos una cotización personal.');
  return {status:'estimated',low:ref.usd,high:ref.usd,currency:'USD',sourceIds:['magic-owner-table'],referenceKind:'unconditioned',estimatedStorage:false,unknownBattery:false,sharedWithPlus:false,samples:[{sourceId:ref.sourceId,usd:ref.usd,estimatedStorage:false}],message:'Valor de la columna S/CONDICIÓN para batería cambiada o que no funciona. Sujeto a revisión del resto del equipo.'};
 }
 if(range.min<70)return manual('La tabla no incluye un valor para baterías con menos del 70%. Coordinamos una evaluación personal.');
 const pending=(data.pendingReferences||[]).some(r=>r.model===input.model&&r.storageGB===storage&&range.min<=r.batteryMax&&range.max>=r.batteryMin);
 if(pending)return manual('El valor de esta combinación está pendiente de confirmación en la tabla de Magic iPhone. Consultanos para cotizarla.');
 const refs=model.references.filter(r=>r.storageGB===storage&&r.condition==='sin_detalles'&&r.usd>0&&range.min<=r.batteryMax&&range.max>=r.batteryMin);
 if(!refs.length)return manual('La tabla de Magic iPhone no incluye un valor para este modelo y capacidad. Podemos cotizarlo personalmente.');
 // A range must be completely covered. Never quote a partial or missing battery band.
 const covered=refs.slice().sort((a,b)=>a.batteryMin-b.batteryMin);let next=range.min;
 for(const ref of covered){if(ref.batteryMin>next)break;next=Math.max(next,ref.batteryMax+1);}
 if(next<=range.max)return manual('No hay una referencia completa para este tramo de batería. Consultanos para confirmar la toma.');
 const values=refs.map(r=>r.usd),low=Math.min(...values),high=Math.max(...values);
 return {status:'estimated',low,high,currency:'USD',sourceIds:['magic-owner-table'],estimatedStorage:false,unknownBattery:input.battery==='unknown',sharedWithPlus:false,samples:refs.map(r=>({sourceId:r.sourceId,usd:r.usd,estimatedStorage:false})),message:input.battery==='unknown'?'Rango de la tabla para baterías del 70% al 100%; si tiene menos del 70%, requiere evaluación personal.':'Valor de referencia según modelo, capacidad y batería. Sujeto a revisión del estado del equipo.'};
}
