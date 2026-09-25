import {categories,RULESET,validDice,score} from '../games/yacht/scoring.js';
import {getGame,games} from '../games/registry.js';
export const SAVE_VERSION=1;
function assert(ok){if(!ok)throw Error('지원하지 않거나 손상된 저장 파일입니다.');}
export function validateSave(data){
 assert(data&&data.version===SAVE_VERSION&&Number.isFinite(data.savedAt));const r=data.room;
 assert(r&&r.version===1&&Object.hasOwn(games,r.gameId)&&['solo','multi'].includes(r.mode)&&['lobby','playing','finished'].includes(r.phase));
 assert(data.id===r.id);
 assert(typeof r.id==='string'&&typeof r.title==='string'&&r.title.length<=40&&typeof r.code==='string'&&r.code.length<=20&&Number.isInteger(r.revision)&&r.revision>=0);
 assert(Array.isArray(r.players)&&r.players.length>=1&&r.players.length<=getGame(r.gameId).maxPlayers);
 assert(new Set(r.players.map(p=>p.id)).size===r.players.length);
 assert(r.players.every(p=>p&&typeof p.id==='string'&&p.id.length<=64&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=16&&typeof p.online==='boolean'&&typeof p.ready==='boolean'));
 assert(r.players.some(p=>p.id===r.hostId));assert(data.tokens&&typeof data.tokens==='object'&&!Array.isArray(data.tokens));
 assert(Object.entries(data.tokens).every(([id,t])=>r.players.some(p=>p.id===id)&&typeof t==='string'&&t.length>=20&&t.length<=100));
 assert(r.players.filter(p=>p.id!==r.hostId&&!p.bot).every(p=>typeof data.tokens[p.id]==='string'));
 assert(Array.isArray(r.messages)&&r.messages.length<=150&&r.messages.every(m=>typeof m.id==='string'&&typeof m.sender==='string'&&typeof m.text==='string'&&m.text.length<=500&&Number.isFinite(m.time)&&typeof m.system==='boolean'));
 if(r.phase==='lobby')assert(r.game===null);
 else if(getGame(r.gameId).validateGame)getGame(r.gameId).validateGame(r.game,r.players,r.phase);
 else{
  const g=r.game;assert(g&&g.rules===RULESET&&g.phase===r.phase&&Array.isArray(g.order)&&g.order.length===r.players.length&&new Set(g.order).size===g.order.length&&g.order.every(id=>r.players.some(p=>p.id===id)));
  assert(Number.isInteger(g.turn)&&g.turn>=0&&g.turn<g.order.length&&Number.isInteger(g.rolls)&&g.rolls>=0&&g.rolls<=3&&Number.isInteger(g.round)&&g.round>=1&&g.round<=12);
  assert(validDice(g.dice)&&Array.isArray(g.held)&&g.held.length===5&&g.held.every(v=>typeof v==='boolean'));
  assert(Array.isArray(g.forfeited)&&new Set(g.forfeited).size===g.forfeited.length&&g.forfeited.every(id=>g.order.includes(id)));
  assert(g.scores&&Object.keys(g.scores).length===g.order.length);
  const expected=Object.fromEntries(g.order.map(id=>[id,{}]));
  assert(Array.isArray(g.history)&&g.history.length<=96);
  for(const h of g.history){assert(h&&g.order.includes(h.player)&&categories.some(c=>c.id===h.category)&&!Object.hasOwn(expected[h.player],h.category)&&validDice(h.dice)&&Number.isInteger(h.rolls)&&h.rolls>=1&&h.rolls<=3);assert(h.value===score(h.category,h.dice));expected[h.player][h.category]=h.value;}
  for(const id of g.order){assert(g.scores[id]&&typeof g.scores[id]==='object'&&Object.keys(g.scores[id]).length===Object.keys(expected[id]).length);for(const [key,value] of Object.entries(g.scores[id]))assert(Object.hasOwn(expected[id],key)&&expected[id][key]===value);}
  const active=g.order.filter(id=>!g.forfeited.includes(id));const done=active.length<2||active.every(id=>Object.keys(g.scores[id]).length===12);
  assert((g.phase==='finished')===done);if(!done)assert(active.includes(g.order[g.turn])&&Object.keys(g.scores[g.order[g.turn]]).length<12&&g.round===Object.keys(g.scores[g.order[g.turn]]).length+1);
 }
 return structuredClone(data);
}
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open('hide-on-bg',1);req.onupgradeneeded=()=>req.result.createObjectStore('saves',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function transaction(mode,fn){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('saves',mode);const req=fn(tx.objectStore('saves'));tx.oncomplete=()=>{d.close();resolve(req.result);};tx.onerror=()=>{d.close();reject(tx.error);};tx.onabort=()=>{d.close();reject(tx.error||Error('저장이 취소되었습니다.'));};});}
export async function saveRoom(room,tokens){const value={id:room.id,version:SAVE_VERSION,savedAt:Date.now(),room:structuredClone(room),tokens:structuredClone(tokens)};validateSave(value);await transaction('readwrite',s=>s.put(value));return value;}
export const listSaves=async()=> (await transaction('readonly',s=>s.getAll())).sort((a,b)=>b.savedAt-a.savedAt);
export const deleteSave=id=>transaction('readwrite',s=>s.delete(id));
export const parseSave=text=>{if(text.length>500000)throw Error('파일은 500KB 이하여야 합니다.');return validateSave(JSON.parse(text));};
export function downloadSave(value){const u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=`workbook-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
