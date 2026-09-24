export const RULESET = 'classic-yacht-v1';
export const categories = [
 ['ones','에이스','1의 합계',5],['twos','듀얼','2의 합계',10],['threes','트리플','3의 합계',15],
 ['fours','쿼드','4의 합계',20],['fives','펜타','5의 합계',25],['sixes','헥사','6의 합계',30],
 ['choice','초이스','모든 눈의 합계',30],['four','포카드','같은 눈 4개만 합산',24],
 ['full','풀하우스','정확히 3 + 2 · 전체 합계',28],['little','리틀 스트레이트','1 · 2 · 3 · 4 · 5',30],
 ['big','빅 스트레이트','2 · 3 · 4 · 5 · 6',30],['yacht','요트','같은 눈 5개',50]
].map(([id,label,hint,max])=>({id,label,hint,max}));
export function validDice(dice){return Array.isArray(dice)&&dice.length===5&&dice.every(v=>Number.isInteger(v)&&v>=1&&v<=6);}
export function score(id,dice){
 if(!validDice(dice)||!categories.some(c=>c.id===id)) throw Error('잘못된 점수 계산 입력');
 const n=categories.findIndex(c=>c.id===id)+1;
 if(n<=6) return dice.filter(d=>d===n).length*n;
 const sum=dice.reduce((a,b)=>a+b,0), counts=Array.from({length:6},(_,i)=>dice.filter(d=>d===i+1).length);
 if(id==='choice')return sum;
 if(id==='four'){const i=counts.findIndex(c=>c>=4);return i<0?0:(i+1)*4;}
 if(id==='full')return counts.includes(3)&&counts.includes(2)?sum:0;
 if(id==='little')return [...dice].sort().join('')==='12345'?30:0;
 if(id==='big')return [...dice].sort().join('')==='23456'?30:0;
 return counts.includes(5)?50:0;
}
export const total = sheet => Object.values(sheet).reduce((a,b)=>a+b,0);
export function ranking(players,game){
 const rows=players.map(p=>({...p,total:total(game.scores[p.id]),forfeited:game.forfeited.includes(p.id)})).sort((a,b)=>Number(a.forfeited)-Number(b.forfeited)||b.total-a.total);
 return rows.map((p,i)=>({...p,rank:p.forfeited?null:rows.findIndex(q=>!q.forfeited&&q.total===p.total)+1}));
}
