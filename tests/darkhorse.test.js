import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,applyGame,forfeit,publicState} from '../src/games/darkhorse/engine.js';
import {HORSES,CARDS,effectOrder} from '../src/games/darkhorse/rules.js';
import {validateGame} from '../src/games/darkhorse/validate.js';
import {chooseAI} from '../src/games/darkhorse/ai.js';
import {createRoom,joinRoom,act} from '../src/core/room.js';
import {validateSave,parseSave} from '../src/core/storage.js';
const players=n=>Array.from({length:n},(_,i)=>({id:`p${i}`,name:`참가 ${i}`}));
const next=g=>applyGame(g,g.order[g.turn],chooseAI(publicState(g,g.order[g.turn]),g.order[g.turn]));
const placed=g=>{while(g.stage==='placement')g=next(g);return g;};
for(let n=2;n<=6;n++)test(`${n} players: deal, seven placements, private AI game, validated snapshots, final ranking`,()=>{
 const ps=players(n);let g=createGame(ps);const initial=structuredClone(g);
 assert.equal(new Set(Object.values(g.owners)).size,n);assert.equal(g.deck.length,30-5*n);assert.equal(g.turn,g.seed.starter);
 for(const p of ps)assert.equal(g.hands[p.id].length,5);
 let last;
 for(let i=0;i<7;i++){last=chooseAI(publicState(g,g.order[g.turn]),g.order[g.turn]).horse;g=next(g);assert.equal(g.horseOrder.length,i+1);validateGame(g,ps,'playing');}
 assert.equal(g.darkHorse,last);assert.equal(g.stage,'cards');assert.deepEqual([...g.horseOrder].sort(),HORSES);
 for(let i=0;i<n*5;i++){
  const id=g.order[g.turn],before=g.step,hand=g.hands[id].length;g=next(g);
  assert.equal(g.step,before+1);assert.equal(g.hands[id].length,hand-1);validateGame(g,ps,g.phase);
  assert.equal(g.phase,i===n*5-1?'finished':'playing');
 }
 assert.equal(g.discard.length,n*5);assert.equal(g.ranking.length,n);
 assert.equal(g.winner,g.order.reduce((a,b)=>g.horseOrder.indexOf(g.owners[a])<g.horseOrder.indexOf(g.owners[b])?a:b));
 assert.throws(()=>next(g));assert.deepEqual(initial.horseOrder,[]);
 const fresh=createGame(ps);assert.equal(fresh.step,0);assert.deepEqual(fresh.discard,[]);assert.deepEqual(fresh.history,[]);assert.equal(fresh.lastAction,null);
});
test('all six effects, boundaries, group order, no-op consumption and invalid targets',()=>{
 assert.deepEqual(effectOrder(HORSES,'advance-1',4),[1,2,4,3,5,6,7]);
 assert.deepEqual(effectOrder(HORSES,'retreat-1',4),[1,2,3,5,4,6,7]);
 assert.deepEqual(effectOrder(HORSES,'sprint-1',4),[1,4,2,3,5,6,7]);
 assert.deepEqual(effectOrder(HORSES,'delay-1',4),[1,2,3,5,6,4,7]);
 assert.deepEqual(effectOrder(HORSES,'swap-1',1,7),[7,2,3,4,5,6,1]);
 assert.deepEqual(effectOrder(HORSES,'convoy-1',4),[1,4,5,2,3,6,7]);
 assert.deepEqual(effectOrder(HORSES,'convoy-1',7),[1,2,3,4,7,5,6]);
 assert.deepEqual(effectOrder(HORSES,'sprint-1',1),HORSES);assert.deepEqual(effectOrder(HORSES,'delay-1',7),HORSES);
 assert.throws(()=>effectOrder(HORSES,'swap-1',1,1));assert.throws(()=>effectOrder(HORSES,'swap-1',1,8));assert.throws(()=>effectOrder(HORSES,'invalid',1));
 const g=placed(createGame(players(2),()=>0)),id=g.order[g.turn];const c=g.hands[id].find(c=>c.startsWith('advance'))||g.hands[id][0];
 const card=CARDS.find(v=>v.id===c);if(card.kind==='move'){
  const horse=card.distance<0?g.horseOrder[0]:g.horseOrder[6],out=applyGame(g,id,{type:'darkPlay',step:g.step,card:c,horse});assert.deepEqual(out.horseOrder,g.horseOrder);assert.equal(out.hands[id].length,4);
 }
});
test('Host rejects wrong turn, phase, duplicate placement, stale step and forged card; ignores injected state',()=>{
 let g=createGame(players(2),()=>0),id=g.order[g.turn],other=g.order.find(p=>p!==id);
 assert.throws(()=>applyGame(g,other,{type:'darkPlace',horse:1,step:0}));assert.throws(()=>applyGame(g,id,{type:'darkPlay',step:0}));
 const a={type:'darkPlace',horse:1,step:0,winner:other,hands:{},horseOrder:[7]};g=applyGame(g,id,a);assert.deepEqual(g.horseOrder,[1]);assert.equal(g.winner,null);
 assert.throws(()=>applyGame(g,g.order[g.turn],a));assert.throws(()=>applyGame(g,g.order[g.turn],{...a,step:1}));
 g=placed(g);id=g.order[g.turn];other=g.order.find(p=>p!==id);assert.throws(()=>applyGame(g,id,{type:'darkPlay',card:g.hands[other][0],horse:1,step:g.step}));
 const selected=chooseAI(publicState(g,id),id);g=applyGame(g,id,selected);assert.throws(()=>applyGame(g,g.order[g.turn],selected));
});
test('guest projection never contains seed, deck, opponents hands, or history; copies are isolated',()=>{
 let g=placed(createGame(players(6)));for(let step=0;step<30;step++){
  for(const id of g.order){const view=publicState(g,id);assert.deepEqual(view.ownHand,g.hands[id]);assert.equal(view.handCounts[id],g.hands[id].length);for(const key of ['seed','deck','hands','history'])assert(!Object.hasOwn(view,key));view.horseOrder.reverse();assert.notDeepEqual(view.horseOrder,g.horseOrder);}
  g=next(g);
 }
 assert.deepEqual(publicState(g,'unknown').ownHand,[]);
});
test('forfeit preserves current turn, hides discarded hands, skips departed players and terminates with one',()=>{
 for(const stage of ['placement','cards']){
  const ps=players(4);let g=createGame(ps);if(stage==='cards')g=placed(g);
  const current=g.order[g.turn],other=g.order.find(id=>id!==current);g=forfeit(g,other);assert.equal(g.order[g.turn],current);assert.equal(g.hands[other].length,0);validateGame(g,ps,g.phase);
  g=forfeit(g,current);assert.notEqual(g.order[g.turn],current);validateGame(g,ps,g.phase);
  g=forfeit(g,g.order[g.turn]);assert.equal(g.phase,'finished');assert.equal(g.ranking.length,1);validateGame(g,ps,g.phase);assert.throws(()=>forfeit(g,g.winner));
 }
});
test('room selection, capacity, private save roundtrip, tamper rejection and restore continuation',()=>{
 const ps=players(6);let r=createRoom(ps[0],'순위전','multi','ABCDEFGHJK');for(const p of ps.slice(1))r=joinRoom(r,p);
 for(const p of ps.slice(1))r=act(r,p.id,{type:'ready'});r=act(r,ps[0].id,{type:'selectGame',gameId:'darkhorse'});assert(r.players.slice(1).every(p=>!p.ready));assert.throws(()=>joinRoom(r,{id:'extra',name:'extra'}));
 for(const p of ps.slice(1))r=act(r,p.id,{type:'ready'});r=act(r,ps[0].id,{type:'start'});
 const save=()=>({id:r.id,version:1,savedAt:Date.now(),room:r,tokens:Object.fromEntries(ps.slice(1).map(p=>[p.id,'x'.repeat(24)]))});
 for(let i=0;i<12;i++){const id=r.game.order[r.game.turn];r=act(r,id,chooseAI(publicState(r.game,id),id));}
 const roundtrip=parseSave(JSON.stringify(save()));assert.deepEqual(roundtrip.room,r);
 for(const change of [g=>g.turn=(g.turn+1)%6,g=>g.winner='p0',g=>g.horseOrder.reverse(),g=>g.hands.p0.push('swap-1'),g=>g.darkHorse=8,g=>g.history[0].action.horse=9]){const bad=structuredClone(save());change(bad.room.game);assert.throws(()=>validateSave(bad));}
 r=roundtrip.room;while(r.phase==='playing'){const id=r.game.order[r.game.turn];r=act(r,id,chooseAI(publicState(r.game,id),id));validateSave(save());}assert.equal(r.phase,'finished');assert(r.messages.length<=150);
});
