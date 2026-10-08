export const STORAGE_KEY='fusha.v1';
export class SessionTimer{
 constructor(now,{idleMs=60000}={}){this.started=now;this.last=now;this.lastActivity=now;this.activeMs=0;this.wallMs=0;this.visible=true;this.idleMs=idleMs;}
 tick(now){
  if(!Number.isFinite(now)||now<this.last)return;
  this.wallMs=now-this.started;
  if(this.visible)this.activeMs+=Math.max(0,Math.min(now,this.lastActivity+this.idleMs)-this.last);
  this.last=now;
 }
 activity(now){this.tick(now);if(this.visible)this.lastActivity=now;}
 setVisible(visible,now){this.tick(now);this.visible=visible;if(visible)this.lastActivity=now;}
 snapshot(){return {activeMs:this.activeMs,wallMs:this.wallMs,status:!this.visible?'hidden':this.last-this.lastActivity>=this.idleMs?'idle':'active'};}
}
export function saveData(storage,state){storage.setItem(STORAGE_KEY,JSON.stringify(state));}
export function loadData(storage){
 try{const data=JSON.parse(storage.getItem(STORAGE_KEY));return data&&data.version===1&&Array.isArray(data.tasks)&&Array.isArray(data.blocks)&&Array.isArray(data.decisions)?data:null;}catch{return null;}
}
export function clearData(storage){storage.removeItem(STORAGE_KEY);}
