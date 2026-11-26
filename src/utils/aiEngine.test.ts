import { describe, expect, it } from 'vitest';
import { initializeGame } from './gameEngine';
import { getAIMoveAdvanced, runOneTrainingGame, runTrainingBatch, exportWeights, importWeights, resetWeights } from './aiEngine';
import { GameState, TileColor } from '../types/game';

function emptyState(): GameState {
  const state = initializeGame(['A', 'B'], ['ai', 'ai'], ['hard', 'hard'], false, false);
  state.plates.forEach((p) => { p.tiles = []; p.type = 'normal'; p.specialColor = undefined; });
  state.center.tiles = [];
  state.center.hasFirstPlayerTile = false;
  state.players.forEach((p) => {
    p.score = 0;
    p.patternLines = Array(5).fill(null).map((_, i) => Array(i + 1).fill(null));
    p.wall = Array(5).fill(null).map(() => Array(5).fill(null).map(() => ({ color: 'blue' as TileColor, placed: false })));
    p.floor = [];
  });
  state.bag = [];
  state.discardPile = [];
  state.phase = 'drafting';
  state.currentPlayerIndex = 0;
  return state;
}

describe('aiEngine', () => {
  it('returns a legal move for hard AI', () => {
    const s = emptyState();
    s.plates[0].tiles = ['red', 'red', 'blue'];
    s.center.tiles = ['yellow'];
    const move = getAIMoveAdvanced(s);
    expect(['center', 'object']).toContain(typeof move.source === 'object' ? 'object' : move.source);
    expect(['red','blue','yellow','black','cyan']).toContain(move.color);
  });

  it('does not throw when special factories are enabled', () => {
    const s = emptyState();
    s.variantSpecialFactories = true;
    s.plates[0].type = 'special_3';
    s.plates[0].tiles = ['red', 'blue'];
    s.plates[1].tiles = ['yellow'];
    expect(() => getAIMoveAdvanced(s)).not.toThrow();
  });

  it('training game completes and returns scores', () => {
    const before = exportWeights();
    const result = runOneTrainingGame(initializeGame);
    expect(result.scores).toHaveLength(2);
    expect(result.games).toBeGreaterThan(0);
    importWeights(before); // restore
  });

  it('runTrainingBatch with evaluation disabled advances count', () => {
    const before = exportWeights();
    const info = runTrainingBatch(2, initializeGame, false);
    expect(info).toBeGreaterThan(0);
    importWeights(before);
  });

  it('export/import round-trips weights', () => {
    const before = exportWeights();
    const parsed = JSON.parse(before);
    expect(parsed.features).toBe(117);
    expect(Array.isArray(parsed.weights)).toBe(true);
    const res = importWeights(before);
    expect(res.success).toBe(true);
    resetWeights();
    importWeights(before);
  });
});
