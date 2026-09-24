import test from 'node:test';import assert from 'node:assert/strict';
import {categories,score,total,ranking} from '../src/games/yacht/scoring.js';
import {createGame,applyGame,currentPlayer,forfeit} from '../src/games/yacht/engine.js';
import {chooseAI} from '../src/games/yacht/ai.js';
const players=[{id:'a',name:'A'},{id:'b',name:'B'}];
test('all 7,776 ordered combinations × 12 scoring categories against independent oracle',()=>{
 for(let code=0;code<7776;code++){
  let n=code;const d=Array.from({length:5},()=>{const v=n%6+1;n=Math.floor(n/6);return v;});const sorted=[...d].sort((a,b)=>a-b),freq={};for(const v of d)freq[v]=(freq[v]||0)+1;const sum=d.reduce((a,b)=>a+b,0);
  const oracle=[1,2,3,4,5,6].map(v=>v*(freq[v]||0));oracle.push(sum,Number(Object.keys(freq).find(k=>freq[k]>=4)||0)*4,Object.values(freq).sort().join(',')==='2,3'?sum:0,sorted.join('')==='12345'?30:0,sorted.join('')==='23456'?30:0,Object.keys(freq).length===1?50:0);
  categories.forEach((c,i)=>assert.equal(score(c.id,d),oracle[i],`${c.id}: ${d}`));
 }
});
test('invalid dice and category rejected',()=>{for(const d of [[],[0,1,2,3,4],[1,1,1,1,7],[1,1,1,1,1.5]])assert.throws(()=>score('choice',d));assert.throws(()=>score('__proto__',[1,1,1,1,1]));});
test('roll limits, hold selection, turn checks and injected results ignored',()=>{
 let g=createGame(players);assert.throws(()=>applyGame(g,'b',{type:'roll'}));assert.throws(()=>applyGame(g,'a',{type:'hold',index:0}));assert.throws(()=>applyGame(g,'a',{type:'score',category:'choice'}));
 g=applyGame(g,'a',{type:'roll',dice:[6,6,6,6,6]},()=>2);assert.deepEqual(g.dice,[2,2,2,2,2]);g=applyGame(g,'a',{type:'hold',index:0});g=applyGame(g,'a',{type:'roll'},()=>3);assert.deepEqual(g.dice,[2,3,3,3,3]);g=applyGame(g,'a',{type:'roll'},()=>4);assert.equal(g.rolls,3);assert.throws(()=>applyGame(g,'a',{type:'roll'}));assert.throws(()=>applyGame(g,'a',{type:'hold',index:1}));g=applyGame(g,'a',{type:'score',category:'choice',value:999});assert.equal(g.scores.a.choice,18);assert.equal(currentPlayer(g),'b');assert.equal(g.rolls,0);
});
test('zero scoring, no duplicate categories, complete game and shared ties',()=>{
 let g=createGame(players);for(const c of categories){for(const p of players){g=applyGame(g,p.id,{type:'roll'},()=>1);g=applyGame(g,p.id,{type:'score',category:c.id});}}
 assert.equal(g.phase,'finished');assert.equal(g.scores.a.big,0);assert.equal(total(g.scores.a),64);assert.deepEqual(ranking(players,g).map(p=>p.rank),[1,1]);assert.throws(()=>applyGame(g,'a',{type:'roll'}));
 let h=createGame(players);for(const p of players){h=applyGame(h,p.id,{type:'roll'},()=>1);h=applyGame(h,p.id,{type:'score',category:'ones'});}h=applyGame(h,'a',{type:'roll'});assert.throws(()=>applyGame(h,'a',{type:'score',category:'ones'}));
});
test('eight players finish exactly 96 turns',()=>{const ps=Array.from({length:8},(_,i)=>({id:String(i)}));let g=createGame(ps);for(const c of categories)for(const p of ps){g=applyGame(g,p.id,{type:'roll'},()=>6);g=applyGame(g,p.id,{type:'score',category:c.id});}assert.equal(g.history.length,96);assert.equal(g.phase,'finished');});
test('forfeits preserve scores and cannot win',()=>{let g=createGame(players);g=forfeit(g,'a');assert.equal(g.phase,'finished');assert.equal(ranking(players,g)[0].id,'b');assert.equal(ranking(players,g)[1].rank,null);});
test('AI keeps a Yacht and completes valid games',()=>{let g=createGame(players);g=applyGame(g,'a',{type:'roll'},()=>6);assert.deepEqual(chooseAI(g,'a'),{type:'score',category:'yacht'});for(let k=0;k<150&&g.phase==='playing';k++){const id=currentPlayer(g),a=chooseAI(g,id);if(a.type==='keep'){for(let i=0;i<5;i++)if(g.held[i]!==a.held[i])g=applyGame(g,id,{type:'hold',index:i});g=applyGame(g,id,{type:'roll'});}else g=applyGame(g,id,a);}assert.equal(g.phase,'finished');});
