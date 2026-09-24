import {getGame} from '../games/registry.js';
export const PROTOCOL=1;
export const uid=()=>crypto.randomUUID();
export function name(value,max=16){if(typeof value!=='string')throw Error('텍스트를 입력하세요.');const s=value.trim().normalize('NFKC');if(!s||s.length>max||/[\u0000-\u001f\u007f]/.test(s))throw Error(`1~${max}자 이내로 입력하세요.`);return s;}
export function createRoom(host,title,mode='multi',code=''){return {version:1,gameId:'yacht',id:uid(),code,title:name(title,40),mode,hostId:host.id,revision:0,phase:'lobby',players:[{id:host.id,name:name(host.name),ready:true,online:true}],game:null,messages:[],createdAt:Date.now(),updatedAt:Date.now()};}
export function system(room,text){room.messages.push({id:uid(),sender:'시스템',text,time:Date.now(),system:true});room.messages=room.messages.slice(-150);}
export function joinRoom(room,player){
 const r=structuredClone(room);if(r.players.some(p=>p.id===player.id))throw Error('기존 참가자는 재접속을 이용하세요.');
 if(r.phase!=='lobby')throw Error('시작된 게임에는 새로 참가할 수 없습니다.');
 if(r.players.length>=getGame(r.gameId).maxPlayers)throw Error('방이 가득 찼습니다.');
 if(r.players.some(p=>p.name.toLocaleLowerCase()===player.name.toLocaleLowerCase()))throw Error('같은 닉네임이 있습니다. 다른 이름을 사용하세요.');
 r.players.push({...player,name:name(player.name),ready:false,online:true});system(r,`${player.name}님이 참가했습니다.`);return touch(r);
}
export function touch(room){room.revision++;room.updatedAt=Date.now();return room;}
export function act(room,actor,action){
 if(!action||typeof action.type!=='string')throw Error('잘못된 요청입니다.');
 const r=structuredClone(room), p=r.players.find(p=>p.id===actor),def=getGame(r.gameId);
 if(!p||!p.online)throw Error('참가자 연결을 확인하세요.');
 if(action.type==='chat'){const text=typeof action.text==='string'?action.text.trim():'';if(!text||text.length>400||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw Error('메모는 1~400자로 입력하세요.');r.messages.push({id:uid(),sender:p.name,text,time:Date.now(),system:false});r.messages=r.messages.slice(-150);}
 else if(action.type==='ready'){if(r.phase!=='lobby'||actor===r.hostId)throw Error('준비를 변경할 수 없습니다.');p.ready=!p.ready;}
 else if(action.type==='start'){
  if(actor!==r.hostId||r.phase!=='lobby'||r.players.length<def.minPlayers||r.players.some(p=>!p.ready||!p.online))throw Error('Host만 모든 참가자의 준비 완료 후 시작할 수 있습니다.');
  r.game=def.createGame(r.players);r.phase='playing';system(r,'게임이 시작되었습니다.');
 }else if(action.type==='leave'){
  if(actor===r.hostId)throw Error('Host는 저장 후 방을 닫아주세요.');
  if(r.phase==='lobby')r.players=r.players.filter(q=>q.id!==actor);
  else if(r.phase==='playing'){r.game=def.forfeit(r.game,actor);p.online=false;r.phase=r.game.phase;}
  system(r,`${p.name}님이 나갔습니다.${r.phase==='lobby'?'':' (기권)'}`);
 }else if(action.type==='remove'){
  if(actor!==r.hostId||r.phase!=='lobby')throw Error('대기실 Host만 참가자를 정리할 수 있습니다.');const target=r.players.find(q=>q.id===action.playerId);if(!target||target.online)throw Error('연결이 끊긴 참가자만 정리할 수 있습니다.');r.players=r.players.filter(q=>q.id!==target.id);system(r,`${target.name}님의 자리를 정리했습니다.`);
 }else if(action.type==='forfeit'){
  if(actor!==r.hostId||r.phase!=='playing')throw Error('Host만 기권 처리할 수 있습니다.');
  const target=r.players.find(q=>q.id===action.playerId);if(!target||target.online)throw Error('연결이 끊긴 참가자만 기권 처리할 수 있습니다.');
  r.game=def.forfeit(r.game,target.id);r.phase=r.game.phase;system(r,`${target.name}님을 기권 처리했습니다.`);
 }else{
  if(r.phase!=='playing')throw Error('게임 진행 중에만 가능합니다.');
  r.game=def.applyGame(r.game,actor,action);r.phase=r.game.phase;
  if(action.type==='score'){const h=r.game.history.at(-1);system(r,`${p.name} · ${def.categories.find(c=>c.id===h.category).label} ${h.value}점`);}
  if(r.phase==='finished')system(r,'게임이 종료되었습니다. 결과 시트를 확인하세요.');
 }
 return touch(r);
}
