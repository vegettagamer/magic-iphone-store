export function catalogState(pathname,search=''){
 const path=pathname.replace(/\/$/,'');
 if(path==='/catalogo/iphone-usados')return {category:'iPhone',condition:'Usado',mode:'used',title:'iPhone usados.',description:'Una nueva historia para tu próximo iPhone.'};
 if(path==='/catalogo/iphone-sellados')return {category:'iPhone',condition:'Nuevo',mode:'sealed',title:'iPhone sellados.',description:'Tu próximo iPhone, nuevo y sellado.'};
 return {category:new URLSearchParams(search).get('categoria')||'Todos',condition:'Todos',mode:'all',title:'Elegí tu próxima conexión.',description:'Grandes equipos. Nuevas posibilidades.'};
}
export function catalogMatches(p,category,condition){return p.available!==false&&(category==='Todos'||p.category===category)&&(condition==='Todos'||p.condition===condition);}
