import {uid,PROTOCOL,joinRoom,act,touch,system} from './room.js';
import {getGame} from '../games/registry.js';
export function roomForPlayer(room,id){const r=structuredClone(room);if(r.game&&getGame(r.gameId).publicState)r.game=getGame(r.gameId).publicState(room.game,id);return r;}
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const inviteCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(10)),n=>alphabet[n%32]).join('');
export const cleanCode=s=>s.toUpperCase().replace(/[\s-]/g,'');
export function validCode(s){return /^[A-HJ-NP-Z2-9]{10}$/.test(s);}
async function peerClass(){
 if(globalThis.Peer)return globalThis.Peer;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('../../vendor/peerjs.min.js',import.meta.url).href;s.onload=resolve;s.onerror=()=>reject(Error('통신 모듈을 불러오지 못했습니다. 배포 빌드 또는 npm install 후 실행하세요.'));document.head.append(s);});
 return globalThis.Peer;
}
export class RoomNetwork{
 constructor({self,onState,onStatus,onError,onPersist}){Object.assign(this,{self,onState,onStatus,onError,onPersist});this.clients=new Map();this.tokens={};this.seen=new Map();this.stopped=false;this.lastHost=Date.now();this.timers=new Set();}
 later(fn,ms){const t=setTimeout(()=>{this.timers.delete(t);if(!this.stopped)fn();},ms);this.timers.add(t);return t;}
 async open(id){
  const Peer=await peerClass();let config={};try{const r=await fetch(new URL('../../network-config.json',import.meta.url));if(r.ok)config=(await r.json()).peerOptions||{};}catch{}
  if(this.stopped)throw Error('연결이 취소되었습니다.');
  this.peer=new Peer(id,{...config,debug:0});this.peer.on('error',e=>{this.onStatus('연결 확인 필요');this.onError(this.friendly(e));});
  this.peer.on('disconnected',()=>{this.onStatus('연결 중개 재접속 중');this.later(()=>{if(!this.peer.destroyed&&this.peer.disconnected)this.peer.reconnect();},2000);});
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('연결 중개 서버 응답이 없습니다. 네트워크를 확인하세요.')),18000);this.peer.once('open',()=>{clearTimeout(timeout);resolve();});this.peer.once('error',e=>{clearTimeout(timeout);reject(Error(this.friendly(e)));});});
 }
 friendly(e){return ({'unavailable-id':'같은 방이 다른 탭에서 실행 중이거나 이전 연결이 정리 중입니다. 잠시 후 이어하기를 누르세요.','peer-unavailable':'Host를 찾을 수 없습니다. 코드와 Host 접속 상태를 확인하세요.','network':'연결 중개 서버에 연결할 수 없습니다.','webrtc':'직접 연결에 실패했습니다. 네트워크 또는 TURN 설정을 확인하세요.'})[e.type]||'연결에 실패했습니다. 네트워크 상태를 확인하고 다시 시도하세요.';}
 async host(room,tokens={}){
  this.isHost=true;this.room=structuredClone(room);this.tokens={...tokens};await this.open(`hobg-v1-${room.code}`);
  this.peer.on('connection',c=>this.accept(c));this.onStatus('연결됨 · Host');this.publish();this.heartbeat();
 }
 async join(code){this.isHost=false;this.code=code;await this.open();this.connect();this.heartbeat();}
 send(c,data){if(c?.open){try{c.send(data);}catch{c.close();}}}
 accept(c){
  if(this.clients.size>=7){this.send(c,{type:'error',message:'방이 가득 찼습니다.'});c.close();return;}
  let id=null,last=Date.now(),count=0,windowAt=Date.now();
  const expiry=this.later(()=>{if(!id)c.close();},12000);
  c.on('data',msg=>{
   if(this.stopped)return;
   try{
    if(!msg||typeof msg!=='object'||JSON.stringify(msg).length>4096)throw Error('잘못된 요청입니다.');
    if(Date.now()-windowAt>1000){windowAt=Date.now();count=0;}if(++count>25)throw Error('요청이 너무 빠릅니다.');
    last=Date.now();if(id){const entry=this.clients.get(id);if(entry?.c!==c)throw Error('만료된 연결입니다.');entry.last=last;}
    if(msg.type==='ping'){this.send(c,id?{type:'state',room:roomForPlayer(this.room,id)}:{type:'pong'});return;}
    if(!id){
     if(msg.type==='hello'&&msg.protocol!==PROTOCOL)throw Error('앱 버전이 다릅니다. 모든 참가자가 새로고침 후 재접속하세요.');
     if(msg.type!=='hello'||msg.protocol!==PROTOCOL||typeof msg.id!=='string'||!/^[-a-f0-9]{36}$/.test(msg.id)||typeof msg.token!=='string'||msg.token.length<20||msg.token.length>100||msg.id===this.room.hostId)throw Error('올바르지 않은 참가 인증입니다.');
     const p=this.room.players.find(p=>p.id===msg.id);
     if(p){
      if(this.tokens[msg.id]!==msg.token)throw Error('재접속 인증이 일치하지 않습니다.');
      if(this.room.game?.forfeited.includes(msg.id))throw Error('기권한 참가자는 재입장할 수 없습니다.');
      const old=this.clients.get(msg.id);if(old&&Date.now()-old.last<15000)throw Error('같은 참가자가 다른 탭에서 접속 중입니다. 해당 탭을 닫고 잠시 후 다시 시도하세요.');
      if(old){this.clients.delete(msg.id);old.c.close();}p.online=true;system(this.room,`${p.name}님이 재접속했습니다.`);touch(this.room);
     }else {this.room=joinRoom(this.room,{id:msg.id,name:msg.name});this.tokens[msg.id]=msg.token;}
     id=msg.id;clearTimeout(expiry);this.clients.set(id,{c,last});this.publish();return;
    }
    if(msg.type==='action'){
     if(typeof msg.requestId!=='string'||msg.requestId.length>64)throw Error('요청 식별자가 없습니다.');
     if(this.seen.has(msg.requestId)){this.send(c,{type:'state',room:roomForPlayer(this.room,id)});return;}
     if(msg.action?.type!=='chat'&&msg.revision!==this.room.revision){this.send(c,{type:'state',room:roomForPlayer(this.room,id)});throw Error('상태가 갱신되었습니다. 다시 선택하세요.');}
     this.room=act(this.room,id,msg.action);this.seen.set(msg.requestId,true);if(this.seen.size>512)this.seen.delete(this.seen.keys().next().value);this.publish();
     if(msg.action.type==='leave'){this.clients.delete(id);if(this.room.phase==='lobby')delete this.tokens[id];this.later(()=>c.close(),100);}
    }else throw Error('지원하지 않는 요청입니다.');
   }catch(e){this.send(c,{type:'error',message:e.message,retry:e.message==='만료된 연결입니다.'});if(!id||e.message==='만료된 연결입니다.')this.later(()=>c.close(),150);}
  });
  const closed=()=>{if(id&&this.clients.get(id)?.c===c){this.clients.delete(id);const p=this.room.players.find(p=>p.id===id);if(p?.online){p.online=false;system(this.room,`${p.name}님의 연결이 끊어졌습니다.`);touch(this.room);this.publish();}}};
  c.on('close',closed);c.on('error',closed);
 }
 connect(){
  if(this.stopped||this.connecting||this.conn?.open)return;this.connecting=true;this.onStatus('Host에 연결 중');
  const c=this.peer.connect(`hobg-v1-${this.code}`,{reliable:true,serialization:'binary'});this.conn=c;
  const timeout=this.later(()=>{if(this.connecting&&this.conn===c){this.connecting=false;c.close();this.onStatus('Host 연결 대기 · 자동 재접속');this.later(()=>this.connect(),2500);}},12000);
  c.on('open',()=>{this.connecting=false;clearTimeout(timeout);this.lastHost=Date.now();this.send(c,{type:'hello',protocol:PROTOCOL,...this.self});});
  c.on('data',msg=>{if(this.stopped||this.conn!==c)return;this.lastHost=Date.now();if(msg?.type==='state'&&msg.room?.version===1&&msg.room.code===this.code){if(!this.room||msg.room.revision>=this.room.revision){this.room=msg.room;this.onState(structuredClone(this.room));}this.onStatus('연결됨');}else if(msg?.type==='error'){if(msg.retry){c.close();this.onStatus('연결 복구 중');}else this.onError(msg.message);}});
  const lost=()=>{if(this.conn!==c)return;this.connecting=false;this.conn=null;this.onStatus('Host 연결 대기 · 자동 재접속');this.later(()=>this.connect(),3000);};c.on('close',lost);c.on('error',lost);
 }
 heartbeat(){
  this.later(()=>{
   if(this.isHost){for(const [id,{c,last}] of this.clients){if(Date.now()-last>20000){c.close();this.clients.delete(id);const p=this.room.players.find(p=>p.id===id);if(p?.online){p.online=false;system(this.room,`${p.name}님의 연결이 끊어졌습니다.`);touch(this.room);this.publish();}}else this.send(c,{type:'ping'});}}
   else {this.send(this.conn,{type:'ping'});if(this.conn&&Date.now()-this.lastHost>20000){this.conn.close();this.conn=null;this.connecting=false;this.onStatus('Host 응답 대기 · 자동 재접속');this.connect();}}
   this.heartbeat();
  },4000);
 }
 publish(){if(this.stopped)return;for(const id of Object.keys(this.tokens))if(!this.room.players.some(p=>p.id===id))delete this.tokens[id];const room=structuredClone(this.room);for(const [id,{c}] of this.clients)this.send(c,{type:'state',room:roomForPlayer(room,id)});this.onState(room);this.onPersist(room,this.tokens);}
 action(action){if(this.isHost){this.room=act(this.room,this.self.id,action);this.publish();}else{if(!this.conn?.open)throw Error('Host 재접속을 기다려주세요.');this.send(this.conn,{type:'action',requestId:uid(),revision:this.room?.revision,action});}}
 stop(){this.stopped=true;for(const t of this.timers)clearTimeout(t);this.peer?.destroy();this.clients.clear();}
}
