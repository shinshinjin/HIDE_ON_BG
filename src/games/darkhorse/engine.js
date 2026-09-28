import {RULESET,HORSES,HAND_SIZE,CARDS,cardById,effectOrder} from './rules.js';
function randomIndex(n){const v=new Uint32Array(1),limit=Math.floor(2**32/n)*n;do{crypto.getRandomValues(v);}while(v[0]>=limit);return v[0]%n;}
function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function fromSeed(seed){
 return {rules:RULESET,seed:structuredClone(seed),order:[...seed.order],owners:{...seed.owners},hands:structuredClone(seed.hands),deck:[...seed.deck],horseOrder:[],darkHorse:null,turn:seed.starter,round:1,step:0,stage:'placement',phase:'playing',forfeited:[],discard:[],history:[],lastAction:null,ranking:[],winner:null};
}
export function createGame(players,random=randomIndex){
 if(players.length<2||players.length>6||new Set(players.map(p=>p.id)).size!==players.length)throw Error('순위전은 2~6명으로 진행합니다.');
 const order=players.map(p=>p.id),horses=shuffle(HORSES,random),deck=shuffle(CARDS.map(c=>c.id),random);
 return fromSeed({order,owners:Object.fromEntries(order.map((id,i)=>[id,horses[i]])),hands:Object.fromEntries(order.map(id=>[id,deck.splice(0,HAND_SIZE)])),deck,starter:random(order.length)});
}
function finish(g){
 g.phase='finished';g.stage='finished';
 g.ranking=g.order.filter(id=>!g.forfeited.includes(id)).sort((a,b)=>g.horseOrder.indexOf(g.owners[a])-g.horseOrder.indexOf(g.owners[b])).map((id,i)=>({id,rank:i+1,position:g.horseOrder.includes(g.owners[id])?g.horseOrder.indexOf(g.owners[id])+1:null}));
 g.winner=g.ranking[0]?.id||null;
}
function advance(g,from){
 const active=g.order.filter(id=>!g.forfeited.includes(id));
 if(active.length<=1||(g.stage==='cards'&&active.every(id=>g.hands[id].length===0))){finish(g);return;}
 for(let offset=1;offset<=g.order.length;offset++){
  const index=(from+offset)%g.order.length,id=g.order[index];
  if(!g.forfeited.includes(id)&&(g.stage==='placement'||g.hands[id].length)){g.turn=index;break;}
 }
 g.round=1+Math.floor(g.discard.length/g.order.length);
}
export function applyGame(state,actor,action){
 if(state.phase!=='playing'||state.order[state.turn]!==actor||state.forfeited.includes(actor))throw Error('현재 차례가 아닙니다.');
 if(!action||action.step!==state.step)throw Error('최신 차례에서 다시 선택하세요.');
 const g=structuredClone(state);
 if(action.type==='darkPlace'&&g.stage==='placement'){
  if(!HORSES.includes(action.horse)||g.horseOrder.includes(action.horse))throw Error('아직 배치하지 않은 말을 선택하세요.');
  g.horseOrder.push(action.horse);g.lastAction={actor,text:`${action.horse}번 말 → ${g.horseOrder.length}위 배치`};
  if(g.horseOrder.length===7){g.darkHorse=action.horse;g.stage='cards';}
  g.history.push({actor,action:{type:action.type,horse:action.horse,step:action.step}});
 }else if(action.type==='darkPlay'&&g.stage==='cards'){
  const index=g.hands[actor].indexOf(action.card);if(index<0)throw Error('자신의 손패에 있는 카드를 선택하세요.');
  const card=cardById(action.card);g.horseOrder=effectOrder(g.horseOrder,action.card,action.horse,action.other);
  g.hands[actor].splice(index,1);g.discard.push(action.card);
  g.lastAction={actor,text:`${card.label} · ${action.horse}번${card.kind==='swap'?` ↔ ${action.other}번`:''}`};
  g.history.push({actor,action:{type:action.type,card:action.card,horse:action.horse,...(card.kind==='swap'?{other:action.other}:{}),step:action.step}});
 }else throw Error('현재 단계에서 할 수 없는 행동입니다.');
 g.step++;advance(g,g.turn);return g;
}
export function forfeit(state,id){
 if(state.phase!=='playing'||!state.order.includes(id)||state.forfeited.includes(id))throw Error('기권할 수 없는 참가자입니다.');
 const g=structuredClone(state);g.forfeited.push(id);g.hands[id]=[];g.history.push({actor:id,action:{type:'forfeit'}});g.step++;g.lastAction={actor:id,text:'기권 · 남은 손패 폐기'};
 // Non-current departures must not skip the current player's turn.
 if(g.order[g.turn]===id)advance(g,g.turn);else advance(g,(g.turn+g.order.length-1)%g.order.length);
 return g;
}
export function publicState(g,id){
 // Allowlist: no seed, deck, other hands, or private discarded cards on any guest channel.
 const keys=['rules','order','owners','horseOrder','darkHorse','turn','round','step','stage','phase','forfeited','discard','lastAction','ranking','winner'];
 return {...Object.fromEntries(keys.map(k=>[k,structuredClone(g[k])])),handCounts:Object.fromEntries(g.order.map(p=>[p,g.hands[p].length])),ownHand:[...(g.hands[id]||[])]};
}
export function actionLog(g,actor,action,players){return [players.find(p=>p.id===actor).name+': '+g.lastAction.text];}
