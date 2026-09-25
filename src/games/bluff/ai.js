import {availableBids,countMatches,STAR} from './rules.js';
// Receives exactly the computer's public view, never another player's dice.
export function chooseAI(g,id){
 const own=g.ownDice||[],unknown=Object.values(g.counts).reduce((a,n)=>a+n,0)-own.length;
 function probability(b){const need=b.count-countMatches({own},b.face),p=b.face===STAR?1/6:1/3;if(need<=0)return 1;if(need>unknown)return 0;let term=(1-p)**unknown,sum=0;for(let k=0;k<=unknown;k++){if(k>=need)sum+=term;term*=((unknown-k)/(k+1))*(p/(1-p));}return sum;}
 const options=availableBids(g.bid).map(b=>({...b,p:probability(b)}));
 if(g.bid&&(probability(g.bid)<0.45||!options.some(b=>b.p>0.3)))return {type:'challenge',round:g.round};
 const b=options.find(b=>b.p>=0.55)||options.reduce((best,b)=>!best||b.p>best.p?b:best,null);
 return b?{type:'bid',round:g.round,count:b.count,face:b.face}:{type:'challenge',round:g.round};
}
