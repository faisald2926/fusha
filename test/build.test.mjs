import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {build} from '../scripts/build.mjs';
test('production build contains executable site, core modules and real evidence',async()=>{
 const result=await build();assert.ok(result.files.includes('public/index.html'));assert.ok(result.files.includes('src/scheduler.mjs'));
 const manifest=JSON.parse(await readFile(new URL('../dist/build-manifest.json',import.meta.url),'utf8'));assert.equal(manifest.nodeMajorMinimum,22);assert.equal(manifest.files.length,result.files.length);
 const evidence=JSON.parse(await readFile(new URL('../dist/docs/evidence.json',import.meta.url),'utf8'));assert.equal(evidence.tests.failed,0);assert.ok(evidence.tests.passed>=8);
});
