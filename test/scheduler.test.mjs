import test from 'node:test';
import assert from 'node:assert/strict';
import {solve,compareDelay,validatePlan} from '../src/scheduler.mjs';
const task=(id,duration,release,deadline)=>({id,title:id,duration,release,deadline});
function validSchedule(tasks,blocks,now,schedule){
 assert.equal(schedule.length,tasks.length);
 assert.equal(new Set(schedule.map(x=>x.id)).size,tasks.length);
 const ordered=[...schedule].sort((a,b)=>a.start-b.start);
 for(let i=0;i<ordered.length;i++){
  const slot=ordered[i],t=tasks.find(t=>t.id===slot.id);
  assert.ok(slot.start>=Math.max(t.release,now));assert.equal(slot.end-slot.start,t.duration);assert.ok(slot.end<=t.deadline);
  assert.ok(blocks.every(b=>slot.end<=b.start||slot.start>=b.end));
  if(i)assert.ok(ordered[i-1].end<=slot.start);
 }
}
// Independent oracle: enumerate every integer start time for each remaining task,
// including deliberate waits; it does not use earliest-start jumps or solver code.
function oracle(tasks,blocks,now,limit=12){
 function place(remaining,occupied){
  if(!remaining.length)return true;
  const [t,...rest]=remaining;
  for(let s=Math.max(now,t.release);s+t.duration<=Math.min(limit,t.deadline);s++){
   const e=s+t.duration;
   if(occupied.every(b=>e<=b.start||s>=b.end)&&place(rest,[...occupied,{start:s,end:e}]))return true;
  }
  return false;
 }
 return place(tasks,blocks);
}
test('searches another order when earliest-deadline greedy fails',()=>{
 const tasks=[task('a',2,2,5),task('b',3,0,6)];
 let cursor=0;const greedy=tasks.map(t=>{const start=Math.max(cursor,t.release);cursor=start+t.duration;return {...t,start,end:cursor};});
 assert.ok(greedy.some(t=>t.end>t.deadline));assert.equal(oracle(tasks,[],0),true);
 const r=solve(tasks,[],0);assert.equal(r.status,'feasible');assert.deepEqual(r.schedule.map(t=>t.id),['b','a']);validSchedule(tasks,[],0,r.schedule);
});
test('delay removes feasibility and every baseline interval satisfies constraints',()=>{
 const tasks=[task('a',30,600,660),task('b',30,600,700)],blocks=[{id:'fixed',title:'حدث',start:630,end:640}];
 const r=compareDelay(tasks,blocks,600,30);assert.equal(r.effect,'lost-feasibility');assert.equal(r.before.status,'feasible');assert.equal(r.after.status,'infeasible');validSchedule(tasks,blocks,600,r.before.schedule);
 assert.ok(r.after.recoveryOptions.length>0);
 for(const option of r.after.recoveryOptions){const kept=tasks.filter(t=>!option.removeIds.includes(t.id));validSchedule(kept,blocks,630,option.schedule);}
});
test('pre-existing infeasibility is never blamed on delay',()=>{
 const r=compareDelay([task('a',40,600,630)],[],600,15);assert.equal(r.effect,'already-infeasible');assert.equal(r.before.status,'infeasible');
});
test('minute-grid oracle agrees over 200 deterministic small plans',()=>{
 let seed=947;const random=n=>{seed=(seed*16807)%2147483647;return seed%n;};
 for(let i=0;i<200;i++){
  const tasks=Array.from({length:1+random(3)},(_,n)=>{const release=random(7);return task(`t${n}`,1+random(4),release,release+1+random(12-release));});
  const blocks=i%3?[{id:'b',title:'b',start:4,end:6}]:[];const now=random(3);
  const r=solve(tasks,blocks,now);assert.equal(r.status==='feasible',oracle(tasks,blocks,now),`case ${i}`);if(r.status==='feasible')validSchedule(tasks,blocks,now,r.schedule);
 }
});
test('invalid input is rejected with Arabic explanations',()=>{
 const good=task('a',10,600,650);
 for(const tasks of [[],[task('a',-1,0,20)],[task('a',NaN,0,20)],[task('a',1.5,0,20)],[{...good,title:''}],Array.from({length:9},(_,i)=>({...good,id:String(i)}))]){
  assert.ok(validatePlan(tasks,[],600).length>0);const r=solve(tasks,[],600);assert.equal(r.status,'invalid');assert.match(r.errors.join(' '),/[\u0600-\u06ff]/);
 }
 assert.equal(solve([good],[{start:610,end:630},{start:620,end:640}],600).status,'invalid');
 assert.equal(solve([good],[],NaN).status,'invalid');assert.equal(solve([good],[],1441).status,'invalid');
 assert.equal(compareDelay([good],[],600,-1).effect,'invalid');
 assert.equal(solve([task('a',1,1439,1440)],[],1439).status,'feasible');
 assert.equal(solve([task('a',1,1439,1440)],[],1440).status,'infeasible');
});
test('8 tasks complete and joint conflict explains recoverable removal sets',()=>{
 const tasks=Array.from({length:8},(_,i)=>task(String(i),30,0,200));const r=solve(tasks,[],0);assert.equal(r.status,'infeasible');assert.ok(r.recoveryOptions.length>0);
 for(const o of r.recoveryOptions)assert.ok(o.removeIds.length>=2);
});
