import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const files=new Map([['/','public/index.html'],['/index.html','public/index.html'],['/styles.css','public/styles.css'],['/app.mjs','public/app.mjs'],['/core/scheduler.mjs','src/scheduler.mjs'],['/core/session.mjs','src/session.mjs'],['/evidence.json','docs/evidence.json']]);
const contentType=path=>path.endsWith('.html')?'text/html; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':path.endsWith('.json')?'application/json; charset=utf-8':'text/javascript; charset=utf-8';
export function createAppServer(){
 return createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  const host=req.headers.host||'';
  if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)){res.writeHead(403);return res.end('المضيف غير مسموح.');}
  if(req.headers.origin&&req.headers.origin!==`http://${host}`){res.writeHead(403);return res.end('المصدر غير مسموح.');}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');res.writeHead(405);return res.end('الطريقة غير مسموحة.');}
  let path;try{path=decodeURIComponent((req.url||'/').split('?')[0]);}catch{res.writeHead(400);return res.end('مسار غير صالح.');}
  const file=files.get(path);if(!file){res.writeHead(404);return res.end('الملف غير موجود.');}
  try{const body=await readFile(resolve(root,file));res.setHeader('Content-Type',contentType(file));res.writeHead(200);res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(500);res.end('تعذر قراءة الملف.');}
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const port=Number(process.env.PORT||4310);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be 1..65535');
 const server=createAppServer();server.listen(port,'127.0.0.1',()=>console.log(`فسحة: http://127.0.0.1:${port}`));
}
