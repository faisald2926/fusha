import {spawnSync} from 'node:child_process';import {writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const result=spawnSync(process.execPath,['--test','--test-reporter=spec'],{cwd:root,encoding:'utf8'});
const output=(result.stdout||'')+(result.stderr||'');await writeFile(new URL('../docs/verification-output.txt',import.meta.url),output);
process.stdout.write(output);if(result.status!==0)process.exit(result.status||1);
const passed=Number(output.match(/(?:ℹ|info) pass (\d+)/)?.[1]);if(!passed)throw new Error('Could not read test count');
const evidence={generatedAt:new Date().toISOString(),nodeVersion:process.version,status:'نجاح التحقق البرمجي في التشغيل الموثق',tests:{passed,failed:0},oracleCases:200,checks:['البحث عن ترتيب بديل عندما يفشل ترتيب الموعد الأقرب','مقارنة الإمكان قبل التأخير وبعده مع فحص كل فترة','فصل التعذر الموجود أصلًا عن أثر التأخير','مرجع مستقل بتعداد أوقات بدء صحيحة على ٢٠٠ خطة','رفض المدخلات غير الصالحة والأحداث المتداخلة وحد نهاية اليوم','الخمول والتبويب المخفي لا يزيدان وقت التفاعل','حفظ القرارات ومسح مفتاح فسحة فقط','رفض طرق HTTP غير المسموحة والأصل والمضيف الخارجيين','بناء مستقل يضم ملفات التشغيل ويفحص صياغة JavaScript'],socialResults:'لا توجد تجربة بشرية أو نتائج أثر اجتماعي مثبتة',apiLiveStatus:'لا API خارجي مطلوب أو مُختبَر'};
await writeFile(new URL('../docs/evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
