import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createSiteApi} from '../lib/site-api.mjs';

const root = resolve(import.meta.dirname,'..');
await mkdir(resolve(root,'output'),{recursive:true});
const secretPath=resolve(root,'output/site-session.key');
let secret;
try {secret=await readFile(secretPath,'utf8');}
catch(error) {if(error.code!=='ENOENT') throw error;secret=randomBytes(32).toString('base64url');await writeFile(secretPath,secret,{mode:0o600,flag:'wx'});}
const api=createSiteApi({secret});
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.md':'text/plain;charset=utf-8','.txt':'text/plain;charset=utf-8'};
const server=createServer(async(req,res)=>{
  if(req.headers.host!=='127.0.0.1:8767'){res.writeHead(403);res.end();return;}
  if(req.url.startsWith('/api/')){await api(req,res);return;}
  try {
    const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1:8767').pathname);
    const publicRoot=resolve(root,'public'), file=resolve(publicRoot,'.'+(path==='/'?'/crow-godmod3.html':path));
    if(!file.startsWith(publicRoot+sep)){res.writeHead(404);res.end();return;}
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(bytes);
  }catch{res.writeHead(404);res.end();}
});
server.listen(8767,'127.0.0.1',()=>console.log('Crow-GodMod3 standalone site: http://127.0.0.1:8767'));
