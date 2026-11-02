// Unknown/new products stay at the end; removed products cannot reappear.
export function applyProductOrder(products,ids=[]){
 const rank=new Map(ids.map((id,i)=>[id,i]));
 return [...products].sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));
}
// Reorder only the visible subset, preserving the slots occupied by other catalogs.
export function moveVisibleProduct(products,visibleIds,fromId,toId){
 const from=visibleIds.indexOf(fromId),to=visibleIds.indexOf(toId);
 if(from<0||to<0||from===to)return products;
 const ids=[...visibleIds];ids.splice(to,0,...ids.splice(from,1));
 const visible=new Set(visibleIds),byId=new Map(products.map(p=>[p.id,p]));let i=0;
 return products.map(p=>visible.has(p.id)?byId.get(ids[i++]):p);
}
