import {categories,RULESET,score} from './scoring.js';
export function randomDie(){const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=4294967292);return a[0]%6+1;}
export function createGame(players){return {rules:RULESET,phase:'playing',order:players.map(p=>p.id),turn:0,round:1,rolls:0,dice:[1,1,1,1,1],held:[false,false,false,false,false],scores:Object.fromEntries(players.map(p=>[p.id,{}])),forfeited:[],history:[]};}
export const currentPlayer = g => g.order[g.turn];
function next(g){
 const active=g.order.filter(id=>!g.forfeited.includes(id));
 if(active.length<2||active.every(id=>Object.keys(g.scores[id]).length===12)){g.phase='finished';return;}
 for(let i=0;i<g.order.length;i++){g.turn=(g.turn+1)%g.order.length;const id=currentPlayer(g);if(!g.forfeited.includes(id)&&Object.keys(g.scores[id]).length<12)break;}
 g.round=Object.keys(g.scores[currentPlayer(g)]).length+1;g.rolls=0;g.held.fill(false);g.dice.fill(1);
}
export function applyGame(game,actor,action,rng=randomDie){
 const g=structuredClone(game);
 if(g.phase!=='playing')throw Error('진행 중인 게임이 아닙니다.');
 if(actor!==currentPlayer(g)||g.forfeited.includes(actor))throw Error('현재 차례가 아닙니다.');
 if(action.type==='roll'){
  if(g.rolls>=3)throw Error('최대 3회까지 굴릴 수 있습니다.');
  if(g.rolls&&g.held.every(Boolean))throw Error('굴릴 주사위를 하나 이상 선택 해제하세요.');
  g.dice=g.dice.map((v,i)=>g.rolls&&g.held[i]?v:rng());g.rolls++;
 }else if(action.type==='hold'){
  if(!g.rolls||g.rolls>=3||!Number.isInteger(action.index)||action.index<0||action.index>4)throw Error('지금은 보관을 변경할 수 없습니다.');
  g.held[action.index]=!g.held[action.index];
 }else if(action.type==='score'){
  if(!g.rolls)throw Error('먼저 주사위를 굴리세요.');
  if(!categories.some(c=>c.id===action.category)||Object.hasOwn(g.scores[actor],action.category))throw Error('기록할 수 없는 항목입니다.');
  const value=score(action.category,g.dice);g.scores[actor][action.category]=value;
  g.history.push({player:actor,category:action.category,value,dice:[...g.dice],rolls:g.rolls});next(g);
 }else throw Error('지원하지 않는 게임 요청입니다.');
 return g;
}
export function forfeit(game,id){const g=structuredClone(game);if(g.phase!=='playing'||!g.order.includes(id)||g.forfeited.includes(id))throw Error('기권할 수 없습니다.');g.forfeited.push(id);if(currentPlayer(g)===id||g.order.filter(p=>!g.forfeited.includes(p)).length<2)next(g);return g;}
