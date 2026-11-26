import { performance } from 'node:perf_hooks';
import { initializeGame, draftTiles } from '../src/utils/gameEngine';
import { getAIMoveAdvanced, exportWeights } from '../src/utils/aiEngine';

type Diff = 'easy' | 'normal' | 'hard';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

function playGame(a: Diff, b: Diff, variantGrayWall = false, variantSpecialFactories = false) {
  let state = initializeGame(['A', 'B'], ['ai', 'ai'], [a, b], variantGrayWall, variantSpecialFactories);
  let turns = 0;
  const t0 = performance.now();
  while (state.phase === 'drafting' && turns < 4000) {
    const move = getAIMoveAdvanced(state);
    state = draftTiles(state, move.source, move.color, move.targetRowIndex, state.currentPlayerIndex);
    turns++;
  }
  const ms = performance.now() - t0;
  return { scores: [state.players[0].score, state.players[1].score] as [number, number], turns, ms };
}

function benchPair(a: Diff, b: Diff, games: number, variantGrayWall = false, variantSpecialFactories = false) {
  let aw = 0, bw = 0, d = 0, as = 0, bs = 0, turns = 0, ms = 0;
  for (let i = 0; i < games; i++) {
    const swap = i % 2 === 1;
    const r = playGame(swap ? b : a, swap ? a : b, variantGrayWall, variantSpecialFactories);
    const aScore = swap ? r.scores[1] : r.scores[0];
    const bScore = swap ? r.scores[0] : r.scores[1];
    as += aScore; bs += bScore; turns += r.turns; ms += r.ms;
    if (aScore > bScore) aw++; else if (bScore > aScore) bw++; else d++;
  }
  const label = `${a} vs ${b}${variantGrayWall ? ' [gray]' : ''}${variantSpecialFactories ? ' [special]' : ''}`;
  console.log(`${label} | games=${games} win=${aw}-${bw}-${d} avg=${(as/games).toFixed(1)}-${(bs/games).toFixed(1)} turns=${(turns/games).toFixed(1)} ms/game=${(ms/games).toFixed(0)} ms/turn=${(ms/Math.max(1,turns)).toFixed(2)}`);
  return { aw, bw, d };
}

const suite = arg('suite', 'smoke');
const smoke = suite === 'smoke';
const games = Number.parseInt(arg('games', smoke ? '10' : '40'), 10);

console.log(`Azul AI bench suite=${suite} games=${games}`);
benchPair('normal', 'easy', games, false, false);
benchPair('hard', 'normal', Math.max(4, Math.floor(games / 2)), false, false);
benchPair('hard', 'normal', Math.max(4, Math.floor(games / 2)), true, false);
benchPair('hard', 'normal', Math.max(4, Math.floor(games / 2)), false, true);
if (!smoke) benchPair('hard', 'hard', Math.max(4, Math.floor(games / 4)), false, false);

const meta = JSON.parse(exportWeights());
console.log(`weights: trainingCount=${meta.trainingCount} features=${meta.features}`);
