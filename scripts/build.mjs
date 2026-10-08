import {readFile,mkdir,writeFile,copyFile,rm,lstat} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));
const files=['public/index.html','public/styles.css','public/app.mjs','src/scheduler.mjs','src/session.mjs','server.mjs','package.json','docs/evidence.json'];
export async function build(){
 if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node 22 or newer is required.');
 const dist=resolve(root,'dist');if(!dist.startsWith(resolve(root)+sep))throw new Error('Build target outside repository');
 try{if((await lstat(dist)).isSymbolicLink())throw new Error('Build target must not be a symlink');}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const file of files){const source=await readFile(resolve(root,file),'utf8');if(!source.trim())throw new Error(`Empty production file: ${file}`);if(file.endsWith('.mjs'))execFileSync(process.execPath,['--check',resolve(root,file)],{stdio:'pipe'});}
 const e=JSON.parse(await readFile(resolve(root,'docs/evidence.json'),'utf8'));if(e.tests.failed!==0||e.tests.passed<8)throw new Error('Passing evidence is required');
 await rm(dist,{recursive:true,force:true});
 for(const file of files){const target=resolve(dist,file);await mkdir(dirname(target),{recursive:true});await copyFile(resolve(root,file),target);}
 // Production has no install or build step: standard Node server + static files.
 const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));pkg.scripts={start:'node server.mjs'};await writeFile(resolve(dist,'package.json'),JSON.stringify(pkg,null,2)+'\n');
 await writeFile(resolve(dist,'build-manifest.json'),JSON.stringify({nodeMajorMinimum:22,runtimeDependencies:0,files},null,2)+'\n');
 return {files,output:dist};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const result=await build();console.log(`BUILD PASS: ${result.files.length} production files, JavaScript syntax checked, zero runtime dependencies.\nOutput: dist/\nRun: node dist/server.mjs`);}
