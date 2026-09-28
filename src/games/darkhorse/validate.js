import {CARDS,HORSES,HAND_SIZE,RULESET} from './rules.js';
import {fromSeed,applyGame,forfeit} from './engine.js';
const check=ok=>{if(!ok)throw Error('손상된 다크호스 순위전 저장 상태입니다.');};
export function validateGame(g,players,phase){
 check(g?.rules===RULESET&&g.phase===phase&&players.length>=2&&players.length<=6);
 const seed=g.seed,ids=players.map(p=>p.id);
 check(seed&&Array.isArray(seed.order)&&seed.order.length===ids.length&&new Set(seed.order).size===ids.length&&seed.order.every(id=>ids.includes(id)));
 check(Number.isInteger(seed.starter)&&seed.starter>=0&&seed.starter<ids.length);
 const map=v=>v&&Object.keys(v).length===ids.length&&ids.every(id=>Object.hasOwn(v,id));
 check(map(seed.owners)&&map(seed.hands)&&new Set(Object.values(seed.owners)).size===ids.length&&ids.every(id=>HORSES.includes(seed.owners[id])&&Array.isArray(seed.hands[id])&&seed.hands[id].length===HAND_SIZE));
 check(Array.isArray(seed.deck));const cards=[...Object.values(seed.hands).flat(),...seed.deck];
 check(cards.length===CARDS.length&&new Set(cards).size===cards.length&&cards.every(id=>CARDS.some(c=>c.id===id)));
 check(Array.isArray(g.history)&&g.history.length<=7+HAND_SIZE*ids.length+ids.length);
 let replay=fromSeed(seed);
 for(const entry of g.history){check(entry&&ids.includes(entry.actor)&&entry.action);replay=entry.action.type==='forfeit'?forfeit(replay,entry.actor):applyGame(replay,entry.actor,entry.action);}
 // Replay also verifies turns, private ownership, phases, effects and final ranking.
 check(JSON.stringify(replay)===JSON.stringify(g));return true;
}
