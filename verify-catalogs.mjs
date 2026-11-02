import assert from 'node:assert/strict';
import {catalogState,catalogMatches} from './public/catalog-filters.js';
const fixtures=[{id:1,category:'iPhone',condition:'Usado',available:true},{id:2,category:'iPhone',condition:'Nuevo',available:true},{id:3,category:'iPhone',condition:'Consultar',available:true},{id:4,category:'Samsung',condition:'Nuevo',available:true},{id:5,category:'iPhone',condition:'Nuevo',available:false}];
const used=catalogState('/catalogo/iphone-usados/'),sealed=catalogState('/catalogo/iphone-sellados/');
assert.deepEqual(fixtures.filter(p=>catalogMatches(p,used.category,used.condition)).map(p=>p.id),[1]);
assert.deepEqual(fixtures.filter(p=>catalogMatches(p,sealed.category,sealed.condition)).map(p=>p.id),[2]);
assert.equal(catalogState('/catalogo/','?categoria=Samsung').category,'Samsung');
assert.deepEqual(fixtures.filter(p=>catalogMatches(p,'Todos','Todos')).map(p=>p.id),[1,2,3,4]);
console.log('Catalog separation passed: used and sealed iPhones, other brands, unknown conditions, hidden inventory and category links.');
