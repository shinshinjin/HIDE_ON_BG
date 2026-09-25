// Ravensburger Bluff, original board + Exact. See docs/BLUFF.md.
export const RULESET='bluff-original-exact-v1';
export const MIN_PLAYERS=2,MAX_PLAYERS=6,START_DICE=5,STAR=6;
export const faceLabel=face=>face===STAR?'★':String(face);
export const bidLabel=bid=>bid?`${faceLabel(bid.face)} × ${bid.count}개 이상`:'첫 선언 대기';
export function validBid(b){return !!b&&Number.isInteger(b.face)&&b.face>=1&&b.face<=STAR&&Number.isInteger(b.count)&&b.count>=1&&b.count<=(b.face===STAR?10:20);}
// Board order: number 1, star 1, number 2, number 3, star 2, number 4, ...
export const position=b=>b.face===STAR?4*b.count-1:2*b.count;
export function higherBid(next,previous){return validBid(next)&&(!previous||position(next)>position(previous)||(next.face!==STAR&&previous.face!==STAR&&next.count===previous.count&&next.face>previous.face));}
export const bids=Object.freeze(Array.from({length:20},(_,i)=>Array.from({length:5},(_,j)=>({count:i+1,face:j+1}))).flat().concat(Array.from({length:10},(_,i)=>({count:i+1,face:STAR}))).sort((a,b)=>position(a)-position(b)||a.face-b.face).map(Object.freeze));
export const availableBids=previous=>bids.filter(b=>higherBid(b,previous));
export function countMatches(dice,face){return Object.values(dice).flat().filter(v=>v===face||(face!==STAR&&v===STAR)).length;}
export function judge(counts,dice,bid,caller){
 const actual=countMatches(dice,bid.face),losses=Object.fromEntries(Object.keys(counts).map(id=>[id,0]));
 const winner=actual<bid.count?caller:bid.player;
 if(actual===bid.count){for(const id of Object.keys(counts))if(id!==bid.player)losses[id]=Math.min(1,counts[id]);}
 else {const loser=actual<bid.count?bid.player:caller;losses[loser]=Math.min(counts[loser],Math.abs(actual-bid.count));}
 return {actual,losses,winner,exact:actual===bid.count};
}
