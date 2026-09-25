import {RULESET,MIN_PLAYERS,MAX_PLAYERS,START_DICE,STAR,higherBid,judge,bidLabel} from './rules.js';
export const currentPlayer=g=>g.order[g.turn];
export function randomDie(){let x;do{x=crypto.getRandomValues(new Uint8Array(1))[0];}while(x>=252);return x%6+1;}
const active=g=>g.order.filter(id=>g.counts[id]>0);
function nextActive(g,index){for(let n=1;n<=g.order.length;n++){const i=(index+n)%g.order.length;if(g.counts[g.order[i]]>0)return i;}return index;}
function deal(g,roll){g.dice=Object.fromEntries(g.order.map(id=>[id,Array.from({length:g.counts[id]},roll)]));g.bid=null;g.result=null;g.stage='bid';}
function finish(g){const alive=active(g);if(alive.length<=1){g.phase='finished';g.winner=alive[0]||null;g.stage='result';}}
export function createGame(players,roll=randomDie){
 if(players.length<MIN_PLAYERS||players.length>MAX_PLAYERS||new Set(players.map(p=>p.id)).size!==players.length)throw Error('Bluff는 2~6명이 필요합니다.');
 const order=players.map(p=>p.id);let candidates=[...order];
 // Independent opening roll, stars have no pips; ties reroll. Never reuse for private dice.
 while(candidates.length>1){const sums=candidates.map(id=>({id,sum:Array.from({length:START_DICE},roll).reduce((a,v)=>a+(v===STAR?0:v),0)}));const max=Math.max(...sums.map(p=>p.sum));candidates=sums.filter(p=>p.sum===max).map(p=>p.id);}
 const g={rules:RULESET,phase:'playing',stage:'bid',order,turn:order.indexOf(candidates[0]),round:1,counts:Object.fromEntries(order.map(id=>[id,START_DICE])),dice:{},bid:null,result:null,history:[],forfeited:[],winner:null};deal(g,roll);return g;
}
export function applyGame(state,actor,action,roll=randomDie){
 if(state.phase!=='playing'||!state.order.includes(actor))throw Error('게임이 종료되었거나 참가자가 아닙니다.');
 if(action.round!==state.round)throw Error('라운드가 변경되었습니다. 다시 선택하세요.');
 const g=structuredClone(state);
 if(action.type==='nextRound'){if(g.stage!=='result')throw Error('공개 판정 후에 진행하세요.');g.round++;deal(g,roll);return g;}
 if(g.stage!=='bid'||currentPlayer(g)!==actor||g.counts[actor]===0)throw Error('현재 차례가 아닙니다.');
 if(action.type==='bid'){
  const b={count:action.count,face:action.face};if(!higherBid(b,g.bid))throw Error('이전보다 높은 유효한 선언을 선택하세요.');g.bid={...b,player:actor};g.turn=nextActive(g,g.turn);
 }else if(action.type==='challenge'){
  if(!g.bid)throw Error('첫 선언 전에는 도전할 수 없습니다.');
  const verdict=judge(g.counts,g.dice,g.bid,actor);
  g.result={round:g.round,bid:{...g.bid},caller:actor,dice:structuredClone(g.dice),before:{...g.counts},...verdict};
  for(const id of g.order)g.counts[id]-=verdict.losses[id];
  g.turn=g.order.indexOf(verdict.winner);g.history.push(structuredClone(g.result));g.stage='result';finish(g);
 }else throw Error('지원하지 않는 Bluff 행동입니다.');
 return g;
}
export function forfeit(state,id){
 const g=structuredClone(state);if(g.phase!=='playing'||!g.order.includes(id)||g.forfeited.includes(id))return g;
 g.forfeited.push(id);if(g.counts[id]===0)return g;g.counts[id]=0;
 // Online-only rule: a departure during a hidden round cancels that round's claim.
 // Redeal remaining dice so the departing player's private data never becomes public.
 if(g.stage==='bid') {if(currentPlayer(g)===id)g.turn=nextActive(g,g.turn);deal(g,randomDie);}
 else if(currentPlayer(g)===id)g.turn=nextActive(g,g.turn);
 finish(g);return g;
}
// Explicit allowlist: no authoritative dice map is sent during a hidden round.
export function publicState(g,id){return structuredClone({rules:g.rules,phase:g.phase,stage:g.stage,order:g.order,turn:g.turn,round:g.round,counts:g.counts,bid:g.bid,forfeited:g.forfeited,winner:g.winner,ownDice:g.stage==='bid'?(g.dice[id]||[]):[],result:g.stage==='result'?g.result:null,history:g.history});}
export function actionLog(g,actor,action,players){
 const name=id=>players.find(p=>p.id===id)?.name||id;
 if(action.type==='bid')return [`${name(actor)}: ${bidLabel(g.bid)}`];
 if(action.type==='nextRound')return [`${g.round}라운드 · 남은 주사위를 다시 굴렸습니다.`];
 if(action.type==='challenge'){const r=g.result;return [`${name(actor)}: BLUFF · ${bidLabel(r.bid)} / 실제 ${r.actual}개${r.exact?' · Exact':''}`, ...Object.entries(r.losses).filter(([,n])=>n).map(([id,n])=>`${name(id)}: 주사위 ${n}개 감소 · ${g.counts[id]}개 남음${g.counts[id]===0?' (탈락)':''}`)];}
 return [];
}
