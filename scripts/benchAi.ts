import { performance } from 'node:perf_hooks';
import { initializeGame } from '../src/utils/gameEngine';
import { getAIMoveAdvanced, exportWeights } from '../src/utils/aiEngine';
import { draftTiles } from '../src/utils/gameEngine';

type Diff = 'easy' | 'normal' | 'hard';

function playGame(a: Diff, b: Diff): { scores: [number, number]; winner: 0 | 1 | -1; turns: number } {
  let state = initializeGame(['A', 'B'], ['ai', 'ai'], [a, b], false, false);
  let turns = 0;
  while (state.phase === 'drafting' && turns < 2000) {
    const move = getAIMoveAdvanced(state);
    state = draftTiles(state, move.source, move.color, move.targetRowIndex, state.currentPlayerIndex);
    turns++;
  }
  const [sa, sb] = [state.players[0].score, state.players[1].score];
  return { scores: [sa, sb], winner: sa > sb ? 0 : sb > sa ? 1 : -1, turns };
}

function benchPair(a: Diff, b: Diff, games: number) {
  let aw = 0, bw = 0, d = 0, at = 0, bt = 0;
  const t0 = performance.now();
  for (let i = 0; i < games; i++) {
    const r = playGame(i % 2 === 0 ? a : b, i % 2 === 0 ? b : a);
    const aScore = i % 2 === 0 ? r.scores[0] : r.scores[1];
    const bScore = i % 2 === 0 ? r.scores[1] : r.scores[0];
    at += aScore; bt += bScore;
    if (aScore > bScore) aw++; else if (bScore > aScore) bw++; else d++;
  }
  const ms = performance.now() - t0;
  console.log(`${a} vs ${b} (${games} games, ${ms.toFixed(0)}ms): ${a} ${aw}-${bw}-${d}, avg ${ (at/games).toFixed(1)} - ${(bt/games).toFixed(1)}`);
}

const games = Number.parseInt(process.argv[2] ?? '20', 10);
benchPair('normal', 'easy', games);
benchPair('hard', 'normal', Math.max(4, Math.floor(games / 2)));
benchPair('hard', 'hard', Math.max(4, Math.floor(games / 2)));
console.log('weights:', JSON.parse(exportWeights()).trainingCount);
