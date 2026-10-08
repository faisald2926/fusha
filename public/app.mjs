import {compareDelay,validatePlan} from '/core/scheduler.mjs';
import {SessionTimer,loadData,saveData,clearData} from '/core/session.mjs';
const $=id=>document.getElementById(id);
const ar=n=>new Intl.NumberFormat('ar-SA',{useGrouping:false}).format(n);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hhmm=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const parseTime=s=>{const value=String(s).trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));if(!/^\d{1,2}:\d{2}$/.test(value))return NaN;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:h===24&&m===0?1440:NaN;};
const number=s=>String(s).trim()===''?NaN:Number(s);
const sample=()=>({version:1,tasks:[{id:'study',title:'مراجعة درس',duration:35,release:1020,deadline:1080},{id:'call',title:'مكالمة عائلية',duration:20,release:1020,deadline:1130},{id:'read',title:'قراءة هادئة',duration:25,release:1100,deadline:1150}],blocks:[{id:'fixed',title:'موعد ثابت',start:1080,end:1100}],now:1020,delay:15,decisions:[]});
let state=sample(),storageAvailable=true;
try{const stored=loadData(localStorage);if(stored){if(validatePlan(stored.tasks,stored.blocks,stored.now,{allowEmpty:true}).length===0&&Number.isInteger(stored.delay)&&stored.delay>=0&&stored.now+stored.delay<=1440){state=stored;state.decisions=stored.decisions.filter(d=>d&&['stop','continue'].includes(d.choice)&&typeof d.at==='string').slice(-100);}else notice('تعذر استعادة الخطة المحفوظة. عُرضت عينة جديدة؛ عدّلها لتناسب يومك.',true);}}catch{storageAvailable=false;notice('التخزين المحلي غير متاح في هذا المتصفح. تظل الخطة في الذاكرة ويمكن تصديرها.',true);}
let comparison,timer=null,lastTimer={activeMs:0,wallMs:0,status:'stopped'},editing=null,currentPage='dashboard';
const effectText={'still-feasible':'الخطة ما زالت ممكنة','lost-feasibility':'التأخير يغيّر قابلية التنفيذ','already-infeasible':'الخطة متعذرة قبل التأخير','invalid':'راجع المدخلات'};
const pageNames={dashboard:'نظرة اليوم',planner:'التزاماتي',history:'قراراتي وبياناتي',evidence:'الدليل التقني'};
function notice(text,error=false){$('notice').textContent=text;$('notice').hidden=false;$('notice').classList.toggle('error',error);}
function persist(){try{saveData(localStorage,state);}catch{storageAvailable=false;notice('تعذر حفظ البيانات. يمكنك تصدير نسخة من صفحة قراراتي وبياناتي.',true);}}
function go(page){if(!pageNames[page])return;currentPage=page;document.querySelectorAll('.page').forEach(e=>e.hidden=e.id!==`page-${page}`);document.querySelectorAll('[data-page]').forEach(e=>{e.classList.toggle('active',e.dataset.page===page);if(e.dataset.page===page)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');});$('page-name').textContent=pageNames[page];location.hash=page;if(page==='evidence')loadEvidence();}
function timeline(result,after){
 const start=state.now,end=Math.min(1440,Math.max(start+60,...state.tasks.map(t=>t.deadline),...state.blocks.filter(b=>b.end>start).map(b=>b.end)));
 const width=700,left=40,right=660,range=Math.max(1,end-start),x=t=>right-(t-start)/range*(right-left);
 const colors=['#2b786b','#7b925c','#6e8898','#877baa','#b28755','#568b83','#908b69','#6b77a4'];
 let svg=`<svg class="timeline-svg" viewBox="0 0 ${width} 141" role="img" aria-label="${after?'جدول بعد التأخير':'جدول البداية الحالية'}"><title>${result.status==='feasible'?'جدول ممكن وفق القيود':'لا يوجد جدول ممكن وفق جميع القيود'}</title><rect x="${left}" y="34" width="${right-left}" height="43" rx="8" fill="#f3f6ef"/><rect x="${left}" y="91" width="${right-left}" height="17" rx="5" fill="#f8f9f5"/>`;
 const steps=range>240?60:30;
 for(let t=Math.ceil(start/steps)*steps;t<=end;t+=steps){svg+=`<line x1="${x(t)}" x2="${x(t)}" y1="27" y2="111" stroke="#e4e9df" stroke-dasharray="3 4"/><text x="${x(t)}" y="18" font-size="10" fill="#829080" text-anchor="middle">${hhmm(t)}</text>`;}
 if(after&&state.delay){const stop=Math.min(end,state.now+state.delay);svg+=`<rect x="${x(stop)}" y="36" width="${x(start)-x(stop)}" height="39" rx="6" fill="#eed6af"/><text x="${(x(stop)+x(start))/2}" y="59" text-anchor="middle" font-size="10" fill="#98723f">+${ar(state.delay)}</text>`;}
 for(const b of state.blocks){if(b.end<=start||b.start>=end)continue;const a=Math.max(b.start,start),z=Math.min(b.end,end);svg+=`<rect x="${x(z)}" y="91" width="${x(a)-x(z)}" height="17" rx="4" fill="#d8dfd5"/><text x="${(x(a)+x(z))/2}" y="129" font-size="9" fill="#879181" text-anchor="middle">${escape(b.title||'حدث ثابت')}</text>`;}
 if(result.status==='feasible')for(const slot of result.schedule){const i=state.tasks.findIndex(t=>t.id===slot.id),w=x(slot.start)-x(slot.end),center=(x(slot.start)+x(slot.end))/2;svg+=`<rect x="${x(slot.end)}" y="36" width="${w}" height="39" rx="7" fill="${colors[i%colors.length]}"/><text x="${center}" y="59" text-anchor="middle" font-size="11" fill="white">${w>105?escape(slot.title):ar(slot.duration)+' د'}</text>`;}
 svg+='</svg>';
 const slots=result.status==='feasible'?`<div class="timeline-slots">${result.schedule.map(s=>`<span><i class="slot-dot"></i>${escape(s.title)} <bdi>${hhmm(s.start)}–${hhmm(s.end)}</bdi></span>`).join('')}</div>`:`<div class="timeline-empty">لا يوجد جدول يحقق جميع القيود المدخلة معًا.</div>`;
 return `<article class="timeline-card"><div class="timeline-title"><div><h3>${after?`إذا انتظرت ${ar(state.delay)} دقيقة`:'إذا بدأت الآن'}</h3><p>بداية التخطيط <bdi>${hhmm(after?state.now+state.delay:state.now)}</bdi></p></div><span class="pill ${result.status==='feasible'?'':'warning'}">${result.status==='feasible'?'جدول ممكن':'متعذر ضمن القيود'}</span></div>${svg}${slots}</article>`;
}
function render(){
 comparison=compareDelay(state.tasks,state.blocks,state.now,state.delay);
 $('now-input').value=Number.isInteger(state.now)?hhmm(state.now):'';$('delay-input').value=Number.isInteger(state.delay)?state.delay:'';
 document.querySelectorAll('[data-delay]').forEach(e=>{const selected=Number(e.dataset.delay)===state.delay;e.classList.toggle('selected',selected);e.setAttribute('aria-pressed',selected);});
 $('hero-start').textContent=`بداية اليوم المخطط ${Number.isInteger(state.now)?hhmm(state.now):'غير محددة'}`;$('hero-count').textContent=`${ar(state.tasks.length)} التزامات · ${ar(state.blocks.length)} حدث ثابت`;
 $('total-duration').textContent=`${ar(state.tasks.reduce((s,t)=>s+t.duration,0))} دقيقة`;$('delay-metric').textContent=Number.isInteger(state.delay)?`${ar(state.delay)} دقيقة`:'غير محدد';
 $('task-count').textContent=ar(state.tasks.length);
 const errors=comparison.effect==='invalid'?comparison.errors:[];$('plan-errors').textContent=errors.join(' ');
 $('stop-decision').disabled=errors.length>0;$('continue-decision').disabled=errors.length>0;
 $('feasibility-metric').textContent=errors.length?'غير متاحة':comparison.after.status==='feasible'?'ممكنة':'تحتاج تعديلًا';
 $('feasibility-small').textContent=errors.length?'أكمل المدخلات أولًا':comparison.after.status==='feasible'?`أقل هامش موعد: ${ar(comparison.after.minimumSlack)} دقيقة`:'وفق قيود الخطة الحالية';
 if(errors.length){$('timeline-before').innerHTML='';$('timeline-after').innerHTML='';$('analysis-message').textContent=errors.join(' ');$('analysis-message').className='analysis-message error';$('decision-summary').textContent='صحح مدخلاتك قبل تسجيل قرار.';$('recovery').innerHTML='';}
 else{
  $('timeline-before').innerHTML=timeline(comparison.before,false);$('timeline-after').innerHTML=timeline(comparison.after,true);
  const message=comparison.effect==='already-infeasible'?'الخطة متعذرة أصلًا حتى إذا بدأت الآن. هذا التعذر موجود قبل التأخير؛ جرّب تعديل المدد أو المواعيد أو تأجيل بعض الالتزامات.':comparison.effect==='lost-feasibility'?`البداية الحالية تسمح بجدول ممكن، لكن التأخير ${ar(state.delay)} دقيقة لا يترك ترتيبًا يحقق جميع القيود معًا. لا يعني ذلك أن التزامًا بعينه سيفشل حتمًا؛ هذه نتيجة للقيود مجتمعة.`:`يوجد ترتيب ممكن بعد تأخير ${ar(state.delay)} دقيقة. أقل هامش إلى موعد نهائي في هذا الجدول ${ar(comparison.after.minimumSlack)} دقيقة، مقابل ${ar(comparison.before.minimumSlack)} دقيقة في الجدول الحالي. هذه هوامش الجدولين المعروضين، وليست أفضل هوامش مضمونة.`;
  $('analysis-message').textContent=message;$('analysis-message').className=`analysis-message ${comparison.effect==='still-feasible'?'':'warning'}`;
  $('decision-summary').textContent=effectText[comparison.effect]+'. اختر ما يناسبك، أو عدّل الخطة.';
  const recovery=comparison.after.status==='infeasible'?comparison.after.recoveryOptions:[];
  $('recovery').innerHTML=recovery.length?`<h3 class="recovery-title">خيارات لاستعادة خطة ممكنة</h3><p class="footnote">أمثلة بأقل عدد من الالتزامات المؤجلة (${ar(comparison.after.removalCount)}). يعاد حساب الخطة عند الاختيار.</p>${recovery.map((o,i)=>`<div class="recovery-option"><span>تأجيل ${o.removeIds.map(id=>escape(state.tasks.find(t=>t.id===id)?.title||id)).join(' + ')}</span><button class="button secondary" data-recovery="${i}">تطبيق التأجيل</button></div>`).join('')}`:'';
 }
 $('tasks-list').innerHTML=state.tasks.length?state.tasks.map((t,i)=>`<div class="task-row"><span class="task-number">${ar(i+1)}</span><span class="task-title">${escape(t.title)}</span><div class="task-detail"><small>المدة</small><strong>${ar(t.duration)} دقيقة</strong></div><div class="task-detail"><small>متاح من</small><strong dir="ltr">${hhmm(t.release)}</strong></div><div class="task-detail"><small>ينتهي قبل</small><strong dir="ltr">${hhmm(t.deadline)}</strong></div><div class="row-actions"><button class="icon-button" data-edit-task="${escape(t.id)}" aria-label="تعديل ${escape(t.title)}">✎</button><button class="icon-button" data-delete-task="${escape(t.id)}" aria-label="حذف ${escape(t.title)}">×</button></div></div>`).join(''):'<div class="empty-state">لا توجد التزامات. أضف التزامًا لبدء المقارنة.</div>';
 $('blocks-list').innerHTML=state.blocks.length?state.blocks.map(b=>`<div class="block-row"><div><strong>${escape(b.title||'حدث ثابت')}</strong><p class="muted"><bdi>${hhmm(b.start)}–${hhmm(b.end)}</bdi> · ${ar(b.end-b.start)} دقيقة محجوزة</p></div><div class="row-actions"><button class="icon-button" data-edit-block="${escape(b.id)}" aria-label="تعديل ${escape(b.title)}">✎</button><button class="icon-button" data-delete-block="${escape(b.id)}" aria-label="حذف ${escape(b.title)}">×</button></div></div>`).join(''):'<div class="empty-state">لا توجد أحداث ثابتة. كل الوقت متاح وفق نوافذ الالتزامات.</div>';
 $('decisions-list').innerHTML=state.decisions.length?[...state.decisions].reverse().map(d=>`<article class="history-row"><div><strong>${d.choice==='stop'?'اخترت التوقف':'اخترت الاستمرار'} ${d.choice==='continue'?`· ${ar(d.delay??0)} دقيقة`:''}</strong><p>${escape(effectText[d.effect]||'نتيجة غير متاحة')} · الإنجاز الفعلي غير متاح</p></div><time>${escape(new Date(d.at).toLocaleString('ar-SA',{dateStyle:'short',timeStyle:'short'}))}</time></article>`).join(''):'<div class="empty-state">عندما تختار التوقف أو الاستمرار، يظهر قرارك هنا.</div>';
 $('add-task').disabled=state.tasks.length>=8;$('add-block').disabled=state.blocks.length>=32;
}
function openEditor(kind,id){
 const item=(kind==='task'?state.tasks:state.blocks).find(t=>t.id===id);editing={kind,id};$('editor-form').reset();$('editor-error').textContent='';
 $('editor-title').textContent=`${id?'تعديل':'إضافة'} ${kind==='task'?'التزام':'حدث ثابت'}`;$('task-fields').hidden=kind!=='task';$('block-fields').hidden=kind!=='block';
 $('item-duration').required=kind==='task';$('item-release').required=kind==='task';$('item-deadline').required=kind==='task';$('item-start').required=kind==='block';$('item-end').required=kind==='block';
 $('item-title').value=item?.title||'';$('item-duration').value=item?.duration||25;$('item-release').value=hhmm(item?.release??state.now);$('item-deadline').value=hhmm(item?.deadline??Math.min(1440,state.now+120));$('item-start').value=hhmm(item?.start??state.now);$('item-end').value=hhmm(item?.end??Math.min(1440,state.now+20));$('editor-dialog').showModal();
}
document.addEventListener('click',event=>{
 const e=event.target.closest('button');if(!e)return;
 if(e.dataset.page)go(e.dataset.page);if(e.dataset.go)go(e.dataset.go);
 if(e.dataset.delay){state.delay=Number(e.dataset.delay);persist();render();}
 if(e.dataset.editTask)openEditor('task',e.dataset.editTask);if(e.dataset.editBlock)openEditor('block',e.dataset.editBlock);
 if(e.dataset.deleteTask){state.tasks=state.tasks.filter(t=>t.id!==e.dataset.deleteTask);persist();render();notice('حُذف الالتزام وأعيد حساب الخطة.');}
 if(e.dataset.deleteBlock){state.blocks=state.blocks.filter(t=>t.id!==e.dataset.deleteBlock);persist();render();notice('حُذف الحدث الثابت وأعيد حساب الخطة.');}
 if(e.dataset.recovery!==undefined){const o=comparison.after.recoveryOptions[Number(e.dataset.recovery)];state.tasks=state.tasks.filter(t=>!o.removeIds.includes(t.id));persist();render();notice('أُجّلت الالتزامات المختارة خارج خطة اليوم. يمكنك إضافتها مجددًا بموعد جديد.');if(!state.tasks.length)go('planner');}
});
$('add-task').addEventListener('click',()=>openEditor('task'));$('add-block').addEventListener('click',()=>openEditor('block'));$('close-editor').addEventListener('click',()=>$('editor-dialog').close());
$('editor-form').addEventListener('submit',event=>{
 event.preventDefault();const id=editing.id||crypto.randomUUID(),title=$('item-title').value.trim();let item;
 if(editing.kind==='task')item={id,title,duration:number($('item-duration').value),release:parseTime($('item-release').value),deadline:parseTime($('item-deadline').value)};
 else item={id,title,start:parseTime($('item-start').value),end:parseTime($('item-end').value)};
 const tasks=editing.kind==='task'?[...state.tasks.filter(t=>t.id!==id),item]:state.tasks;
 const blocks=editing.kind==='block'?[...state.blocks.filter(t=>t.id!==id),item]:state.blocks;
 let errors=validatePlan(tasks,blocks,state.now);
 if(editing.kind==='block'&&!tasks.length)errors=errors.filter(e=>!e.includes('التزامات'));
 if(!title||title.length>80)errors.push('اسم الحدث مطلوب، وبحد أقصى ثمانين حرفًا.');
 if(errors.length){$('editor-error').textContent=errors.join(' ');return;}
 state.tasks=tasks;state.blocks=blocks;persist();render();$('editor-dialog').close();notice('حُفظ التعديل وأعيد حساب الخطة.');
});
$('now-input').addEventListener('change',()=>{state.now=parseTime($('now-input').value);render();if(Number.isInteger(state.now))persist();});
$('delay-input').addEventListener('change',()=>{state.delay=number($('delay-input').value);render();if(comparison.effect!=='invalid')persist();});
$('sample-reset').addEventListener('click',()=>{const decisions=state.decisions;state=sample();state.decisions=decisions;persist();render();notice('حُمّلت العينة المؤلفة. سجل قراراتك محفوظ.');});
function updateTimer(){
 if(timer){timer.tick(performance.now());lastTimer=timer.snapshot();}
 const fmt=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
 $('timer-active').textContent=fmt(lastTimer.activeMs);$('timer-wall').textContent=fmt(lastTimer.wallMs);$('timer-status').textContent=timer?({active:'نشط',idle:'خامل',hidden:'التبويب مخفي'}[lastTimer.status]):'متوقف';$('timer-toggle').textContent=timer?'إنهاء المؤقت':'بدء جلسة اختيارية';
}
function startTimer(){timer=new SessionTimer(performance.now());timer.setVisible(!document.hidden,performance.now());updateTimer();}
function stopTimer(){if(timer){timer.tick(performance.now());lastTimer=timer.snapshot();timer=null;}updateTimer();}
$('timer-toggle').addEventListener('click',()=>timer?stopTimer():startTimer());
for(const name of ['pointerdown','keydown','pointermove','scroll'])document.addEventListener(name,()=>timer?.activity(performance.now()),{passive:true});
document.addEventListener('visibilitychange',()=>{timer?.setVisible(!document.hidden,performance.now());updateTimer();});window.addEventListener('pagehide',()=>timer?.setVisible(false,performance.now()));window.addEventListener('pageshow',()=>timer?.setVisible(!document.hidden,performance.now()));setInterval(updateTimer,1000);
function decide(choice){
 if(comparison.effect==='invalid')return;
 if(choice==='stop')stopTimer();else if(!timer)startTimer();updateTimer();
 state.decisions.push({choice,at:new Date().toISOString(),now:state.now,delay:state.delay,effect:comparison.effect,before:comparison.before.status,after:comparison.after.status,activeMs:lastTimer.activeMs,wallMs:lastTimer.wallMs,completion:'unknown'});state.decisions=state.decisions.slice(-100);persist();render();notice(choice==='stop'?'سُجل قرار التوقف. يمكنك الآن البدء وفق الخطة الحالية.':'سُجل قرار الاستمرار. المؤقت اختياري؛ الخطة المعروضة تجربة للتأخير الذي اخترته.');
}
$('stop-decision').addEventListener('click',()=>decide('stop'));$('continue-decision').addEventListener('click',()=>decide('continue'));
$('export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),timer:lastTimer},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fusha-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('صُدّرت بياناتك إلى ملف JSON.');});
$('clear-data').addEventListener('click',()=>{let failed=false;try{clearData(localStorage);}catch{failed=true;}stopTimer();lastTimer={activeMs:0,wallMs:0,status:'stopped'};state=sample();render();updateTimer();notice(failed?'تعذر مسح النسخة المحفوظة؛ مُسحت بيانات الذاكرة فقط وقد تعود بعد إعادة التحميل.':'مُسحت بيانات فسحة. العينة الظاهرة غير محفوظة حتى تجري تعديلًا أو تسجل قرارًا.',failed);});
let evidenceLoaded=false;
async function loadEvidence(){
 if(evidenceLoaded)return;
 try{const response=await fetch('/evidence.json');if(!response.ok)throw new Error();const e=await response.json();
  $('evidence-results').innerHTML=`<div class="panel-heading"><h2>تحقق برمجي موثق</h2><span class="pill">${escape(e.status)}</span></div><p class="muted">تشغيل فعلي بتاريخ ${escape(e.generatedAt)} · Node ${escape(e.nodeVersion)}</p><div class="evidence-stat-grid"><div class="evidence-stat"><strong>${ar(e.tests.passed)}</strong><span>اختبارات ناجحة</span></div><div class="evidence-stat"><strong>${ar(e.oracleCases)}</strong><span>خطط صغيرة مقابل مرجع مستقل</span></div><div class="evidence-stat"><strong>${ar(e.tests.failed)}</strong><span>اختبارات فاشلة في التشغيل الموثق</span></div></div>${e.checks.map(c=>`<div class="evidence-test"><span>✓</span><div>${escape(c)}</div></div>`).join('')}<p class="footnote">المصدر: docs/evidence.json، ومخرجات التشغيل الكاملة في docs/verification-output.txt. هذه نتائج تقنية فقط.</p>`;evidenceLoaded=true;
 }catch{$('evidence-results').textContent='الدليل غير متاح حاليًا. راجع ملف docs/evidence.json في المستودع.';}
}
window.addEventListener('hashchange',()=>go(location.hash.slice(1)||'dashboard'));render();updateTimer();go(location.hash.slice(1)||'dashboard');
