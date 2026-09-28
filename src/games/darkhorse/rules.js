// Approved non-betting variant, not the 2014 board game's official rules.
export const RULESET='darkhorse-rank-v1';
export const HORSES=[1,2,3,4,5,6,7];
export const HAND_SIZE=5;
export const EFFECTS={
 advance:{label:'앞으로 1칸',kind:'move',distance:-1},
 retreat:{label:'뒤로 1칸',kind:'move',distance:1},
 sprint:{label:'앞으로 2칸',kind:'move',distance:-2},
 delay:{label:'뒤로 2칸',kind:'move',distance:2},
 swap:{label:'두 말 자리 교환',kind:'swap'},
 convoy:{label:'연속 두 말 앞으로 2칸',kind:'group',distance:-2}
};
export const CARDS=Object.entries(EFFECTS).flatMap(([effect,definition])=>Array.from({length:5},(_,i)=>({id:`${effect}-${i+1}`,effect,...definition})));
export const cardById=id=>CARDS.find(c=>c.id===id);
export function effectOrder(order,cardId,horse,other){
 const card=cardById(cardId),result=[...order],index=result.indexOf(horse);
 if(!card||index<0||order.length!==7)throw Error('유효한 카드와 말을 선택하세요.');
 if(card.kind==='swap'){
  const j=result.indexOf(other);if(j<0||j===index)throw Error('서로 다른 두 말을 선택하세요.');
  [result[index],result[j]]=[result[j],result[index]];
 }else{
  const count=card.kind==='group'?Math.min(2,result.length-index):1;
  const block=result.splice(index,count),destination=Math.max(0,Math.min(result.length,index+card.distance));
  result.splice(destination,0,...block);
 }
 return result;
}
