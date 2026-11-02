// Run against a NEW, empty database only. Snapshot files and downloaded media are private.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
const [snapshotPath,...flags]=process.argv.slice(2);if(!snapshotPath)throw new Error('Uso: npm run import:catalog -- /ruta/privada/catalog-snapshot.json [--local]');
const local=flags.includes('--local'),snapshot=JSON.parse(readFileSync(snapshotPath,'utf8'));
if(!Array.isArray(snapshot.products)||!Array.isArray(snapshot.catalog_meta))throw new Error('Copia incompleta del catálogo.');
const wrangler=['node_modules/wrangler/bin/wrangler.js'];
const run=args=>{const r=spawnSync(process.execPath,[...wrangler,...args],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.status!==0)throw new Error(r.stderr||r.stdout||'No se completó la importación.');return r.stdout;};
const result=JSON.parse(run(['d1','execute','DB',local?'--local':'--remote','--command','SELECT (SELECT COUNT(*) FROM products) AS products,(SELECT COUNT(*) FROM catalog_meta) AS meta;','--json']));
const count=result.flatMap(x=>x.results||[])[0];if(!count||Number(count.products)||Number(count.meta))throw new Error('La base destino ya tiene catálogo. Se detuvo la importación para no sobrescribirlo.');
const media=[...new Set(snapshot.products.flatMap(row=>{const p=JSON.parse(row.data);return p.images.filter(x=>x.startsWith('/media/'));}))];
const config=JSON.parse(readFileSync('wrangler.json','utf8'));
for(const path of media){if(!/^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))throw new Error('Ruta de imagen no válida.');const file=resolve(dirname(snapshotPath),'media',path.slice(7));if(!existsSync(file))throw new Error('Falta descargar una foto: '+path);const type=path.endsWith('.jpg')?'image/jpeg':path.endsWith('.png')?'image/png':'image/webp';run(['r2','object','put',config.r2_buckets[0].bucket_name+'/'+path.slice(7),'--file',file,'--content-type',type,local?'--local':'--remote']);}
const sqlQuote=value=>value===null?'NULL':"'"+String(value).replaceAll("'","''")+"'";
const statements=[];
for(const row of snapshot.products){const keys=['id','slug','data','version','updated_at'];if(keys.some(k=>row[k]===undefined))throw new Error('Fila de producto incompleta.');statements.push(`INSERT INTO products (${keys.join(',')}) VALUES (${keys.map(k=>sqlQuote(row[k])).join(',')});`);}
for(const row of snapshot.catalog_meta)statements.push(`INSERT INTO catalog_meta (key,value) VALUES (${sqlQuote(row.key)},${sqlQuote(row.value)});`);
const privateDir=resolve('.migration-private');mkdirSync(privateDir,{recursive:true,mode:0o700});const sqlPath=resolve(privateDir,'import.sql');writeFileSync(sqlPath,statements.join('\n'),{mode:0o600});
run(['d1','execute','DB',local?'--local':'--remote','--file',sqlPath,'--yes']);
const validation=JSON.parse(run(['d1','execute','DB',local?'--local':'--remote','--command','SELECT COUNT(*) AS total FROM products;','--json']));if(Number(validation.flatMap(x=>x.results||[])[0]?.total)!==snapshot.products.length)throw new Error('No coincide la cantidad de productos importados.');
console.log(`Catálogo trasladado: ${snapshot.products.length} productos y ${media.length} fotos. No se importan sesiones ni contraseñas.`);
