import {view} from './ui/view.js';
import {uid,name,createRoom,joinRoom,act,system,touch} from './core/room.js';
import {RoomNetwork,inviteCode,cleanCode,validCode} from './core/network.js';
import {saveRoom,listSaves,deleteSave,parseSave,downloadSave,validateSave} from './core/storage.js';
import {currentPlayer} from './games/yacht/engine.js';
import {chooseAI} from './games/yacht/ai.js';
const app=document.querySelector('#app');
const getLocal=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const identity=getLocal('hobg-identity',{id:uid(),token:uid(),name:''});
const s={self:identity,room:null,tab:'home',status:'오프라인 · 혼자 플레이 가능',saveStatus:'',saves:[],lastJoin:getLocal('hobg-last-join',null),fields:{nickname:identity.name,roomname:'주간 업무 기록',invite:new URLSearchParams(location.search).get('room')||'',chat:''},busy:false,error:'',notice:''};
let net=null,tokens={},aiTimer=null,releaseLock=null,saveQueue=Promise.resolve();
function local(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{notify('브라우저 저장소 접근이 제한되어 재접속 정보가 유지되지 않을 수 있어요.');}}
function error(e){s.error=e.message||String(e);s.notice='';render();}
function notify(text){s.notice=text;s.error='';render();}
function render(){
 const active=document.activeElement;const field=active?.dataset?.field;const pos=field?[active.selectionStart,active.selectionEnd]:null;
 const scroll=app.querySelector('.score-scroll')?.scrollLeft||0;const messages=app.querySelector('.messages');const nearBottom=!messages||messages.scrollHeight-messages.scrollTop-messages.clientHeight<50;const oldTop=messages?.scrollTop||0;
 app.innerHTML=view(s);if(field){const input=app.querySelector(`[data-field="${field}"]`);input?.focus({preventScroll:true});if(pos)input?.setSelectionRange(...pos);}
 const table=app.querySelector('.score-scroll');if(table)table.scrollLeft=scroll;const log=app.querySelector('.messages');if(log)log.scrollTop=nearBottom?log.scrollHeight:oldTop;
}
function persist(room=s.room,credentials=tokens){if(!room||room.hostId!==s.self.id)return Promise.resolve();const snapshot=structuredClone(room),auth=structuredClone(credentials);s.saveStatus='저장 중…';const pending=saveQueue.catch(()=>{}).then(()=>saveRoom(snapshot,auth));saveQueue=pending;pending.then(()=>{s.saveStatus='자동 저장됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});render();},e=>{s.saveStatus='저장 실패';error(Error('자동 저장 실패: '+e.message+' · JSON 내보내기로 기록을 보관하세요.'));});return pending;}
async function lock(id){if(releaseLock)return;if(!navigator.locks){throw Error('이 브라우저는 안전한 중복 접속 방지를 지원하지 않습니다. 최신 브라우저를 이용하세요.');}await new Promise((resolve,reject)=>{navigator.locks.request('hobg-session-'+id,{ifAvailable:true},async l=>{if(!l){reject(Error('다른 탭에서 같은 참가자가 접속 중입니다. 먼저 해당 탭을 닫아주세요.'));return;}await new Promise(done=>{releaseLock=done;resolve();});}).catch(reject);});}
function setupIdentity(){s.self={...identity,name:name(s.fields.nickname)};Object.assign(identity,s.self);local('hobg-identity',identity);}
function stop(){net?.stop();net=null;clearTimeout(aiTimer);aiTimer=null;releaseLock?.();releaseLock=null;s.busy=false;}
function updateRoom(r){s.room=r;if(s.tab==='home')s.tab='game';render();scheduleAI();}
function network(){return new RoomNetwork({self:s.self,onState:updateRoom,onStatus:status=>{s.status=status;render();},onError:message=>error(Error(message)),onPersist:(r,t)=>{tokens={...t};persist(r,t);}});}
function scheduleAI(){
 clearTimeout(aiTimer);if(s.room?.mode!=='solo'||s.room.phase!=='playing')return;const r=s.room,p=r.players.find(p=>p.id===currentPlayer(r.game));if(!p.bot)return;
 aiTimer=setTimeout(()=>{try{if(s.room!==r)return;const a=chooseAI(r.game,p.id);if(a.type==='keep'){for(let i=0;i<5;i++)if(s.room.game.held[i]!==a.held[i])s.room=act(s.room,p.id,{type:'hold',index:i});s.room=act(s.room,p.id,{type:'roll'});}else s.room=act(s.room,p.id,a);persist();updateRoom(s.room);}catch(e){error(e);}},450);
}
async function solo(){if(s.room)throw Error('먼저 현재 문서를 닫아주세요.');setupIdentity();await lock(s.self.id);tokens={};let r=createRoom(s.self,s.fields.roomname,'solo');r=joinRoom(r,{id:'computer',name:s.self.name==='컴퓨터'?'컴퓨터 AI':'컴퓨터',bot:true});r.players[1].ready=true;r=act(r,s.self.id,{type:'start'});s.status='로컬 · 컴퓨터와 작업 중';updateRoom(r);await persist();}
async function host(){if(s.room)throw Error('먼저 현재 문서를 닫아주세요.');setupIdentity();await lock(s.self.id);tokens={};const r=createRoom(s.self,s.fields.roomname,'multi',inviteCode());net=network();await net.host(r);}
async function join(rejoin=false){if(s.room)throw Error('먼저 현재 문서를 닫아주세요.');setupIdentity();const code=cleanCode(rejoin?s.lastJoin.code:s.fields.invite);if(!validCode(code))throw Error('초대 코드 10자리를 확인하세요.');await lock(s.self.id);s.lastJoin={code};local('hobg-last-join',s.lastJoin);net=network();await net.join(code);s.tab='game';notify('Host에 접속하고 있어요. 잠시 기다려주세요.');}
async function restore(value){if(s.room)throw Error('먼저 현재 문서를 닫아주세요.');const data=validateSave(value);const r=data.room;s.self={...identity,...r.players.find(p=>p.id===r.hostId)};await lock(s.self.id);tokens=data.tokens;s.tab='game';r.players.forEach(p=>{p.online=p.id===r.hostId||!!p.bot;});system(r,'저장 문서를 복구했습니다. 참가자의 재접속을 기다립니다.');touch(r);if(r.mode==='multi'){net=network();await net.host(r,tokens);}else{s.status='로컬 · 저장 문서 복구됨';updateRoom(r);await persist();}}
function action(a){s.error='';if(!s.room)throw Error('먼저 문서를 열어주세요.');if(s.room.mode==='solo'){s.room=act(s.room,s.self.id,a);persist();updateRoom(s.room);}else net.action(a);}
async function closeRoom(){if(!s.room){stop();s.status='오프라인 · 혼자 플레이 가능';s.tab='home';render();return;}const host=s.room.hostId===s.self.id;if(!confirm(host?'문서를 저장하고 닫을까요? 공유 게임은 Host가 돌아올 때까지 멈춥니다.':'문서에서 나갈까요? 진행 중인 게임에서는 기권 처리됩니다.'))return;if(host){await persist();}else if(s.status.startsWith('연결됨')){const leavingId=s.self.id;action({type:'leave'});await new Promise((resolve,reject)=>{const started=Date.now();const check=()=>{if(!s.room.players.some(p=>p.id===leavingId)||s.room.game?.forfeited.includes(leavingId)||s.room.phase==='finished'){resolve();return;}if(Date.now()-started>5000){reject(Error('퇴장 확인을 받지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.'));return;}setTimeout(check,100);};check();});}stop();s.room=null;s.status='오프라인 · 혼자 플레이 가능';s.tab='home';render();}
async function run(actionName,el){
 if(['solo','host','join','rejoin','restore'].includes(actionName)){if(s.busy)return;if(!s.room&&net)stop();s.busy=true;render();try{if(actionName==='solo')await solo();if(actionName==='host')await host();if(actionName==='join'||actionName==='rejoin')await join(actionName==='rejoin');if(actionName==='restore')await restore(s.saves.find(v=>v.id===el.dataset.id));}catch(e){if(!s.room)stop();throw e;}finally{s.busy=false;render();}return;}
 if(['home','game','log','rules','saves'].includes(actionName)){s.tab=actionName;if(actionName==='saves')s.saves=await listSaves();if(actionName==='game'&&!s.room)s.tab='home';render();return;}
 if(actionName==='cancel'){stop();s.status='오프라인 · 혼자 플레이 가능';s.error='';render();}
 if(actionName==='dismiss'){s.error='';s.notice='';render();}
 if(actionName==='roll'||actionName==='ready'||actionName==='start')action({type:actionName});
 if(actionName==='hold')action({type:'hold',index:Number(el.dataset.index)});
 if(actionName==='score'){const cat=el.dataset.category;const {score,categories}=await import('./games/yacht/scoring.js');if(score(cat,s.room.game.dice)===0&&!confirm(`${categories.find(c=>c.id===cat).label}에 0점을 기록할까요? 되돌릴 수 없어요.`))return;action({type:'score',category:cat});}
 if(actionName==='remove')action({type:'remove',playerId:el.dataset.player});
 if(actionName==='forfeit'&&confirm('연결이 끊긴 참가자를 기권 처리할까요? 되돌릴 수 없어요.'))action({type:'forfeit',playerId:el.dataset.player});
 if(actionName==='save'){await persist();notify('문서를 저장했어요.');}
 if(actionName==='export'){downloadSave({id:s.room.id,version:1,savedAt:Date.now(),room:s.room,tokens});notify('JSON에는 재접속 인증정보가 포함돼요. 개인적으로 보관하세요.');}
 if(actionName==='import')document.querySelector('#import-file').click();
 if(actionName==='exportSaved')downloadSave(s.saves.find(v=>v.id===el.dataset.id));
 if(actionName==='delete'){if(s.room?.id===el.dataset.id)throw Error('열려 있는 문서는 먼저 닫아주세요.');if(confirm('저장 문서를 영구 삭제할까요?')){await deleteSave(el.dataset.id);s.saves=await listSaves();render();}}
 if(actionName==='copy'){try{await navigator.clipboard.writeText(s.room.code);notify('초대 코드를 복사했어요: '+s.room.code);}catch{notify('초대 코드를 직접 복사하세요: '+s.room.code);}}
 if(actionName==='leave')await closeRoom();
 if(actionName==='rematch'){const mode=s.room.mode;await closeRoom();if(!s.room){if(mode==='solo')await solo();else await host();}}
}
app.addEventListener('input',e=>{if(e.target.dataset.field)s.fields[e.target.dataset.field]=e.target.value;});
app.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el&&!el.disabled)run(el.dataset.action,el).catch(error);});
app.addEventListener('submit',e=>{if(e.target.id==='chat-form'){e.preventDefault();try{action({type:'chat',text:s.fields.chat.trim()});s.fields.chat='';render();document.querySelector('#chat')?.focus();}catch(e){error(e);}}});
app.addEventListener('change',async e=>{if(e.target.id==='import-file'){try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw Error('파일은 500KB 이하여야 합니다.');const data=parseSave(await file.text());await restore(data);}catch(e){stop();error(e);}}});
document.addEventListener('keydown',e=>{if(e.target.id==='chat'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();document.querySelector('#chat-form').requestSubmit();return;}if(e.target.closest('input,textarea,button,select,a')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(s.room?.phase==='playing'&&currentPlayer(s.room.game)===s.self.id){try{if(e.code==='Space'){e.preventDefault();action({type:'roll'});}else if(/^[1-5]$/.test(e.key))action({type:'hold',index:Number(e.key)-1});}catch(e){error(e);}}});
window.addEventListener('pagehide',()=>{net?.stop();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
render();listSaves().then(v=>{s.saves=v;if(v.length&&!s.lastJoin)notify('저장한 문서가 있어요. ‘저장 문서’에서 이어갈 수 있어요.');}).catch(e=>error(Error('저장 기능을 사용할 수 없습니다: '+e.message)));
