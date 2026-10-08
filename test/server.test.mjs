import test from 'node:test';import assert from 'node:assert/strict';
import {request} from 'node:http';
test('local HTTP server restricts methods, paths, origin and host',async()=>{
 const {createAppServer}=await import('../server.mjs');
 const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port,url=`http://127.0.0.1:${port}`;
 try{
  const home=await fetch(url);assert.equal(home.status,200);assert.match(await home.text(),/فسحة/);assert.match(home.headers.get('content-security-policy'),/default-src 'self'/);
  assert.equal((await fetch(url+'/core/scheduler.mjs')).status,200);
  assert.equal((await fetch(url+'/package.json')).status,404);
  assert.equal((await fetch(url+'/%2e%2e%2fpackage.json')).status,404);
  assert.equal((await fetch(url,{method:'POST'})).status,405);
  assert.equal((await fetch(url,{headers:{Origin:'https://foreign.example'}})).status,403);
  const foreignHostStatus=await new Promise((resolve,reject)=>{const req=request(url,{headers:{Host:'foreign.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  assert.equal(foreignHostStatus,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
