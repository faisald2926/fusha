import test from 'node:test';import assert from 'node:assert/strict';
import {SessionTimer,saveData,loadData,clearData} from '../src/session.mjs';
test('hidden and idle time are excluded from active time but counted as wall time',()=>{
 const t=new SessionTimer(0,{idleMs:60000});t.tick(10000);assert.equal(t.snapshot().activeMs,10000);
 t.setVisible(false,10000);t.tick(110000);assert.equal(t.snapshot().activeMs,10000);assert.equal(t.snapshot().wallMs,110000);
 t.setVisible(true,110000);t.tick(200000);assert.equal(t.snapshot().activeMs,70000);t.activity(200000);t.tick(205000);assert.equal(t.snapshot().activeMs,75000);
});
test('local decisions survive reopening and clearing preserves unrelated data',()=>{
 const entries=new Map([['another-app','keep']]);const storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 const state={version:1,tasks:[{id:'a',title:'مذاكرة',duration:20,release:600,deadline:700}],blocks:[],now:600,delay:15,decisions:[{choice:'stop',at:'2026-10-08T00:00:00Z',effect:'still-feasible'}]};
 saveData(storage,state);assert.deepEqual(loadData(storage),state);clearData(storage);assert.equal(loadData(storage),null);assert.equal(entries.get('another-app'),'keep');
 entries.set('fusha.v1','broken json');assert.equal(loadData(storage),null);
});
