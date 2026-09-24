import {categories,score} from './scoring.js';
// One-step exact expectimax: all 32 keep masks and all outcomes, not random play.
// Opportunity cost preserves difficult categories instead of taking a cheap zero.
const costs=[2,4,6,8,10,12,20,12,13,14,14,12];
const utility=(c,d)=>score(c.id,d)-costs[categories.indexOf(c)];
export function chooseAI(game,id){
 const available=categories.filter(c=>!Object.hasOwn(game.scores[id],c.id));
 const best=d=>available.reduce((a,c)=>utility(c,d)>utility(a,d)?c:a);
 const category=best(game.dice);
 if(!game.rolls)return {type:'roll'};
 if(game.rolls>=3)return {type:'score',category:category.id};
 let max=utility(category,game.dice),mask=31;
 for(let m=0;m<31;m++){
  let sum=0,count=0;const d=[...game.dice];
  function visit(i){if(i===5){sum+=utility(best(d),d);count++;return;}if(m&(1<<i)){visit(i+1);return;}for(let n=1;n<=6;n++){d[i]=n;visit(i+1);}}
  visit(0);const expected=sum/count;if(expected>max+0.001){max=expected;mask=m;}
 }
 if(mask===31)return {type:'score',category:category.id};
 return {type:'keep',held:Array.from({length:5},(_,i)=>!!(mask&(1<<i)))};
}
