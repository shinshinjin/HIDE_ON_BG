import * as engine from './yacht/engine.js';
import {categories,RULESET} from './yacht/scoring.js';
import * as bluff from './bluff/engine.js';
import {RULESET as BLUFF_RULES,MIN_PLAYERS,MAX_PLAYERS} from './bluff/rules.js';
import {validateGame} from './bluff/validate.js';
export const games={yacht:{id:'yacht',name:'Yacht Dice',minPlayers:2,maxPlayers:8,rules:RULESET,categories,...engine},bluff:{id:'bluff',name:'Bluff',minPlayers:MIN_PLAYERS,maxPlayers:MAX_PLAYERS,rules:BLUFF_RULES,...bluff,validateGame}};
export function getGame(id){if(!Object.hasOwn(games,id))throw Error('지원하지 않는 게임입니다.');return games[id];}
