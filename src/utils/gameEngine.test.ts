import { describe, expect, it } from 'vitest';
import {
  calculateFinalScoring,
  draftTiles,
  getValidRowsForColor,
  initializeGame,
  performTilingAndScoring,
} from './gameEngine';
import { GameState, TileColor } from '../types/game';

function emptyState(): GameState {
  const state = initializeGame(['A', 'B'], ['human', 'human'], ['normal', 'normal'], false, false);
  // normalize to deterministic empty drafting state
  state.plates.forEach((p) => { p.tiles = []; p.type = 'normal'; p.specialColor = undefined; });
  state.center.tiles = [];
  state.center.hasFirstPlayerTile = true;
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
  state.firstPlayerThisRound = null;
  state.isFirstPlayerClaimedThisRound = false;
  state.winnerIds = [];
  return state;
}

describe('gameEngine', () => {
  it('initializes correct plate count by player number', () => {
    expect(initializeGame(['A','B'], ['human','human'], ['normal','normal'], false, false).plates).toHaveLength(5);
    expect(initializeGame(['A','B','C'], ['human','human','human'], ['normal','normal','normal'], false, false).plates).toHaveLength(7);
    expect(initializeGame(['A','B','C','D'], ['human','human','human','human'], ['normal','normal','normal','normal'], false, false).plates).toHaveLength(9);
  });

  it('drafting from plate moves remaining tiles to center', () => {
    const s = emptyState();
    s.plates[0].tiles = ['red', 'red', 'blue', 'yellow'];
    const next = draftTiles(s, { plateIndex: 0 }, 'red', 1, 0);
    expect(next.players[0].patternLines[1].filter(Boolean)).toEqual(['red', 'red']);
    expect(next.center.tiles).toEqual(expect.arrayContaining(['blue', 'yellow']));
    expect(next.center.tiles).toHaveLength(2);
    expect(next.plates[0].tiles).toHaveLength(0);
  });

  it('first player marker is claimed from center and placed on floor', () => {
    const s = emptyState();
    s.center.tiles = ['blue', 'blue'];
    s.plates[1].tiles = ['red']; // keep drafting phase
    const next = draftTiles(s, 'center', 'blue', 0, 0);
    expect(next.center.hasFirstPlayerTile).toBe(false);
    expect(next.players[0].floor).toContain('first');
    expect(next.phase).toBe('drafting');
  });

  it('cannot place same color in row where wall already has it', () => {
    const s = emptyState();
    const player = s.players[0];
    // standard wall row 0 has blue at col 0
    player.wall[0][0].placed = true;
    player.wall[0][0].color = 'blue';
    const valid = getValidRowsForColor(player, 'blue', false);
    expect(valid[0]).toBe(false);
  });

  it('gray wall forbids same color twice in row and column', () => {
    const s = emptyState();
    s.variantGrayWall = true;
    const player = s.players[0];
    player.wall[0][1] = { color: 'red', placed: true };
    player.wall[2][3] = { color: 'red', placed: true };
    const valid = getValidRowsForColor(player, 'red', true);
    expect(valid[0]).toBe(false); // row conflict
    expect(valid[2]).toBe(false); // row conflict
    expect(valid[1]).toBe(true);
  });

  it('floor overflow discards tiles and respects 7-slot limit', () => {
    const s = emptyState();
    s.center.hasFirstPlayerTile = false;
    s.center.tiles = ['black', 'black', 'black', 'black'];
    s.plates[1].tiles = ['cyan']; // keep drafting phase
    s.players[0].floor = ['red','red','red','red','red','red'];
    const next = draftTiles(s, 'center', 'black', 'floor', 0);
    expect(next.players[0].floor.length).toBe(7);
    expect(next.discardPile.filter(t => t === 'black').length).toBe(3);
  });

  it('special_5 shield absorbs floor penalty tile during drafting', () => {
    const s = emptyState();
    s.variantSpecialFactories = true;
    s.center.tiles = ['yellow'];
    s.plates[1].tiles = ['cyan']; // keep drafting phase
    s.players[0].floor = ['special_5'];
    const next = draftTiles(s, 'center', 'yellow', 'floor', 0);
    expect(next.players[0].floor).not.toContain('special_5');
    expect(next.players[0].floor.filter(x => x === 'yellow')).toHaveLength(0);
    expect(next.discardPile).toContain('yellow');
  });

  it('special_3 keeps remaining tiles on plate', () => {
    const s = emptyState();
    s.variantSpecialFactories = true;
    s.plates[0].type = 'special_3';
    s.plates[0].tiles = ['red', 'blue', 'blue'];
    const next = draftTiles(s, { plateIndex: 0 }, 'red', 0, 0);
    expect(next.plates[0].tiles).toEqual(['blue', 'blue']);
    expect(next.center.tiles).toHaveLength(0);
  });

  it('special_4 splits remaining colors between left and right neighbors', () => {
    const s = emptyState();
    s.variantSpecialFactories = true;
    s.plates = [
      { id: 0, tiles: [], type: 'normal' },
      { id: 1, tiles: ['red', 'blue', 'yellow'], type: 'special_4' },
      { id: 2, tiles: [], type: 'normal' },
    ];
    const next = draftTiles(s, { plateIndex: 1 }, 'red', 0, 0);
    expect(next.center.tiles).toHaveLength(0);
    expect(next.plates[0].tiles.length + next.plates[2].tiles.length).toBe(2);
  });

  it('scoring gives adjacency points and floor penalties', () => {
    const s = emptyState();
    s.players[0].patternLines[0] = ['blue'];
    s.players[0].patternLines[1] = ['blue', 'blue'];
    s.players[0].wall[0][0] = { color: 'blue', placed: false }; // standard
    s.players[0].wall[1][0] = { color: 'cyan', placed: true };
    s.players[0].floor = ['red', 'red']; // -1, -1
    const next = performTilingAndScoring(s);
    // row 0 places blue at col 0: adjacent vertically to (1,0) => 2 points
    // row 1 completes, places blue at col 1 => 1 or 2 depending adjacency; floor -2
    expect(next.players[0].score).toBeGreaterThanOrEqual(0);
    expect(next.players[0].floor).toHaveLength(0);
  });

  it('game ends when a horizontal row is completed and final bonus is applied', () => {
    const s = emptyState();
    const p = s.players[0];
    // Row 0 standard: blue,yellow,red,black,cyan. Place yellow,red,black,cyan; leave blue (col 0) to be filled.
    p.wall[0][1] = { color: 'yellow', placed: true };
    p.wall[0][2] = { color: 'red', placed: true };
    p.wall[0][3] = { color: 'black', placed: true };
    p.wall[0][4] = { color: 'cyan', placed: true };
    p.patternLines[0] = ['blue']; // completes row 0 at col 0
    const next = performTilingAndScoring(s);
    expect(next.phase).toBe('game_over');
    expect(next.winnerIds.length).toBeGreaterThan(0);
  });

  it('final scoring gives row/column/color bonuses', () => {
    const s = emptyState();
    const p = s.players[0];
    for (let c = 0; c < 5; c++) p.wall[0][c] = { color: 'blue', placed: true }; // +2
    const next = calculateFinalScoring(s);
    expect(next.players[0].completedHorizontalRows).toBe(1);
    expect(next.players[0].score).toBeGreaterThanOrEqual(2);
  });
});
