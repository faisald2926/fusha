/** Single-day, single-person, non-preemptive scheduling. Minutes are integers. */
export const LIMITS=Object.freeze({tasks:8,blocks:32,day:1440,recoveryOptions:6});
const minute=n=>Number.isInteger(n)&&n>=0&&n<=LIMITS.day;
export function validatePlan(tasks,blocks,now){
 const errors=[];
 if(!minute(now))errors.push('بداية التخطيط يجب أن تكون دقيقة صحيحة داخل اليوم.');
 if(!Array.isArray(tasks)||tasks.length<1||tasks.length>LIMITS.tasks)errors.push('أدخل من التزام واحد إلى ثمانية التزامات.');
 if(!Array.isArray(blocks)||blocks.length>LIMITS.blocks)errors.push('يمكن إدخال اثنين وثلاثين حدثًا ثابتًا كحد أقصى.');
 const ids=new Set();
 if(Array.isArray(tasks))for(const t of tasks){
  if(!t||typeof t.id!=='string'||!t.id.trim()||ids.has(t.id))errors.push('كل التزام يحتاج معرّفًا فريدًا.');
  if(t)ids.add(t.id);
  if(!t||typeof t.title!=='string'||!t.title.trim()||t.title.length>80)errors.push('اسم الالتزام مطلوب، وبحد أقصى ثمانين حرفًا.');
  if(!t||!Number.isInteger(t.duration)||t.duration<1||t.duration>1440)errors.push('مدة الالتزام يجب أن تكون عددًا صحيحًا موجبًا بالدقائق.');
  if(!t||!minute(t.release)||!minute(t.deadline)||t.release>=t.deadline)errors.push('وقت الإتاحة يجب أن يسبق الموعد النهائي داخل اليوم.');
 }
 if(Array.isArray(blocks)){
  const good=blocks.filter(b=>b&&minute(b.start)&&minute(b.end)&&b.start<b.end);
  if(good.length!==blocks.length)errors.push('بداية الحدث الثابت يجب أن تسبق نهايته داخل اليوم.');
  const sorted=[...good].sort((a,b)=>a.start-b.start);
  if(sorted.some((b,i)=>i>0&&sorted[i-1].end>b.start))errors.push('الأحداث الثابتة متداخلة؛ صحح أوقاتها قبل التحليل.');
 }
 return [...new Set(errors)];
}
function earliest(t,cursor,blocks){
 let start=Math.max(cursor,t.release);
 for(const b of blocks){if(start+t.duration<=b.start)break;if(start<b.end&&start+t.duration>b.start)start=b.end;}
 return start;
}
// An earlier arrival at the same subset dominates a later arrival: waiting is
// allowed and future tasks see identical releases, deadlines and fixed blocks.
function search(tasks,blocks,now){
 const all=(1<<tasks.length)-1,best=new Map();let visited=0;
 function walk(mask,cursor,schedule){
  visited++;
  if(mask===all)return schedule;
  if(best.has(mask)&&best.get(mask)<=cursor)return null;
  best.set(mask,cursor);
  for(let i=0;i<tasks.length;i++){
   if(mask&(1<<i))continue;
   const t=tasks[i],start=earliest(t,cursor,blocks),end=start+t.duration;
   if(end>t.deadline)continue;
   const found=walk(mask|(1<<i),end,[...schedule,{id:t.id,title:t.title,start,end,duration:t.duration,deadline:t.deadline}]);
   if(found)return found;
  }
  return null;
 }
 const schedule=walk(0,now,[]);return {schedule,visited};
}
export function solve(tasks,blocks,now){
 const errors=validatePlan(tasks,blocks,now);if(errors.length)return {status:'invalid',errors};
 const sorted=[...blocks].sort((a,b)=>a.start-b.start),r=search(tasks,sorted,now);
 if(r.schedule)return {status:'feasible',schedule:r.schedule,visited:r.visited,minimumSlack:Math.min(...r.schedule.map(t=>t.deadline-t.end)),assumption:'estimated-durations'};
 const recoveryOptions=[];let removalCount=0;
 // Minimum-cardinality removal choices, up to six examples. Empty remainder is
 // a valid schedule internally although an empty user plan is invalid input.
 for(let count=1;count<=tasks.length&&!recoveryOptions.length;count++){
  for(let mask=1;mask<(1<<tasks.length);mask++){
   if(mask.toString(2).split('1').length-1!==count)continue;
   const kept=tasks.filter((_,i)=>!(mask&(1<<i))),solution=search(kept,sorted,now);
   if(solution.schedule){removalCount=count;recoveryOptions.push({removeIds:tasks.filter((_,i)=>mask&(1<<i)).map(t=>t.id),schedule:solution.schedule});if(recoveryOptions.length===LIMITS.recoveryOptions)break;}
  }
 }
 return {status:'infeasible',reason:'لا يوجد ترتيب يحقق جميع القيود المدخلة معًا ضمن هذا اليوم.',conflictIds:tasks.map(t=>t.id),removalCount,recoveryOptions,visited:r.visited};
}
export function compareDelay(tasks,blocks,now,delay){
 const errors=validatePlan(tasks,blocks,now);
 if(!Number.isInteger(delay)||delay<0||delay>1440||now+delay>1440)errors.push('التأخير يجب أن يكون دقائق صحيحة لا تتجاوز نهاية اليوم.');
 if(errors.length)return {effect:'invalid',errors:[...new Set(errors)]};
 const before=solve(tasks,blocks,now),after=solve(tasks,blocks,now+delay);
 const effect=before.status==='infeasible'?'already-infeasible':after.status==='infeasible'?'lost-feasibility':'still-feasible';
 return {effect,before,after,now,delay,completion:'unknown'};
}
