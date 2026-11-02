import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(readFileSync(new URL('../wrangler.json',import.meta.url)));
if(config.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000')throw new Error('Falta crear/vincular la base de datos de tu cuenta Cloudflare. No se publicó nada.');
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy'],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
process.exit(result.status??1);
