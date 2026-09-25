import {RULESET,MAX_PLAYERS,START_DICE,validBid,judge} from './rules.js';
const check=ok=>{if(!ok)throw Error('손상된 Bluff 저장 상태입니다.');};
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateGame(g,players,phase){
 check(g&&g.rules===RULESET&&g.phase===phase&&['playing','finished'].includes(phase));
 check(Array.isArray(g.order)&&g.order.length>=2&&g.order.length<=MAX_PLAYERS&&g.order.length===players.length&&new Set(g.order).size===g.order.length&&g.order.every(id=>players.some(p=>p.id===id)));
 const map=(v,predicate)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===g.order.length&&g.order.every(id=>Object.hasOwn(v,id)&&predicate(v[id]));
 const countMap=v=>map(v,n=>integer(n,0,START_DICE));
 const diceMap=v=>map(v,a=>Array.isArray(a)&&a.length<=START_DICE&&a.every(n=>integer(n,1,6)));
 check(integer(g.turn,0,g.order.length-1)&&integer(g.round,1,30)&&['bid','result'].includes(g.stage));
 check(countMap(g.counts)&&diceMap(g.dice)&&Array.isArray(g.forfeited)&&new Set(g.forfeited).size===g.forfeited.length&&g.forfeited.every(id=>g.order.includes(id)&&g.counts[id]===0));
 const bid=b=>validBid(b)&&g.order.includes(b.player);
 check(g.bid===null||bid(g.bid));
 check(Array.isArray(g.history)&&g.history.length<30);
 const previous=Object.fromEntries(g.order.map(id=>[id,START_DICE]));
 for(let i=0;i<g.history.length;i++){
  const h=g.history[i];check(h&&h.round===i+1&&bid(h.bid)&&g.order.includes(h.caller)&&h.caller!==h.bid.player&&countMap(h.before)&&diceMap(h.dice)&&countMap(h.losses));
  check(g.order.every(id=>h.dice[id].length===h.before[id]&&(h.before[id]===previous[id]||(g.forfeited.includes(id)&&h.before[id]===0))));
  check(h.before[h.bid.player]>0&&h.before[h.caller]>0);
  const verdict=judge(h.before,h.dice,h.bid,h.caller);check(h.actual===verdict.actual&&h.winner===verdict.winner&&h.exact===verdict.exact&&g.order.every(id=>h.losses[id]===verdict.losses[id]));
  for(const id of g.order)previous[id]=h.before[id]-h.losses[id];
 }
 check(g.order.every(id=>g.counts[id]===previous[id]||(g.forfeited.includes(id)&&g.counts[id]===0)));
 if(g.result){check(g.stage==='result'&&equal(g.result,g.history.at(-1))&&equal(g.bid,g.result.bid)&&equal(g.dice,g.result.dice)&&g.round===g.history.length);}
 else {check(g.round===g.history.length+1&&g.order.every(id=>g.dice[id].length===g.counts[id]));if(g.bid)check(g.stage==='bid'&&g.counts[g.bid.player]>0&&g.bid.player!==g.order[g.turn]);}
 const alive=g.order.filter(id=>g.counts[id]>0);check((phase==='finished')===(alive.length<=1));
 check(g.winner===(phase==='finished'?(alive[0]||null):null));
 if(phase==='playing')check(g.counts[g.order[g.turn]]>0&&(g.stage!=='result'||!!g.result));
 return true;
}
