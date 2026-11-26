import { useState, useEffect, useRef } from 'react';
import { GameState, TileColor, PlayerType } from './types/game';
import type { AIDifficulty } from './types/game';
import { initializeGame, draftTiles, getValidRowsForColor } from './utils/gameEngine';
import {
  clearHumanTrajectory,
  getAIMoveAdvanced,
  getTrainingInfo,
  learnFromHumanGame,
  recordHumanDecision,
} from './utils/aiEngine';
import { Setup } from './components/Setup';
import { Board } from './components/Board';
import { Plate } from './components/Plate';
import { CenterArea } from './components/CenterArea';
import { RulesModal } from './components/RulesModal';
import { Tile } from './components/Tile';
import { cn } from './utils/cn';
import canvasConfetti from 'canvas-confetti';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  
  // Selection state
  const [selectedSource, setSelectedSource] = useState<'center' | { plateIndex: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<TileColor | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const learnedCurrentGameRef = useRef(false);

  // Scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.log]);

  // AI Move Effect
  useEffect(() => {
    if (!gameState) return;
    
    if (gameState.phase === 'drafting') {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.type === 'ai') {
        const thinkTime = currentPlayer.aiDifficulty === 'hard' ? 800 : currentPlayer.aiDifficulty === 'normal' ? 600 : 400;
        const timer = setTimeout(() => {
          const move = getAIMoveAdvanced(gameState);
          handleDraft(move.source, move.color, move.targetRowIndex, gameState.currentPlayerIndex);
        }, thinkTime);
        return () => clearTimeout(timer);
      }
    }
    
    if (gameState.phase === 'game_over') {
      if (!learnedCurrentGameRef.current) {
        learnFromHumanGame(gameState);
        learnedCurrentGameRef.current = true;
      }
      // Fire confetti!
      canvasConfetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [gameState?.currentPlayerIndex, gameState?.phase, gameState?.round]);

  const handleStartGame = (
    playerNames: string[],
    playerTypes: PlayerType[],
    aiDifficulties: AIDifficulty[],
    variantGrayWall: boolean,
    variantSpecialFactories: boolean
  ) => {
    const newState = initializeGame(playerNames, playerTypes, aiDifficulties, variantGrayWall, variantSpecialFactories);
    clearHumanTrajectory();
    learnedCurrentGameRef.current = false;
    setGameState(newState);
    setSelectedSource(null);
    setSelectedColor(null);
  };

  const handleTileSelect = (source: 'center' | { plateIndex: number }, color: TileColor) => {
    if (!gameState || gameState.phase !== 'drafting') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.type === 'ai') return; // Not human's turn

    // Toggle selection
    if (
      selectedSource && 
      ((source === 'center' && selectedSource === 'center') || 
       (typeof source === 'object' && typeof selectedSource === 'object' && source.plateIndex === selectedSource.plateIndex)) &&
      selectedColor === color
    ) {
      setSelectedSource(null);
      setSelectedColor(null);
    } else {
      setSelectedSource(source);
      setSelectedColor(color);
    }
  };

  const handleDraft = (
    source: 'center' | { plateIndex: number },
    color: TileColor,
    targetRowIndex: number | 'floor',
    playerIndex: number
  ) => {
    setGameState((prev) => {
      if (!prev) return prev;
      if (prev.players[playerIndex].type === 'human') {
        recordHumanDecision(prev, playerIndex);
      }
      return draftTiles(prev, source, color, targetRowIndex, playerIndex);
    });

    setSelectedSource(null);
    setSelectedColor(null);
  };

  const handleRowPlacement = (rowIndex: number) => {
    if (!gameState || !selectedSource || !selectedColor) return;
    handleDraft(selectedSource, selectedColor, rowIndex, gameState.currentPlayerIndex);
  };

  const handleFloorPlacement = () => {
    if (!gameState || !selectedSource || !selectedColor) return;
    handleDraft(selectedSource, selectedColor, 'floor', gameState.currentPlayerIndex);
  };

  const handleRestart = () => {
    if (window.confirm('ゲームを終了してタイトルに戻りますか？')) {
      setGameState(null);
      setSelectedSource(null);
      setSelectedColor(null);
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1e293b_0%,_#0f172a_45%,_#020617_100%)] text-slate-100 p-4 md:p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        </div>
        <div className="relative min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Setup onStartGame={handleStartGame} onOpenRules={() => setIsRulesOpen(true)} />
        </div>
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer.type === 'human' && gameState.phase === 'drafting';
  
  // Calculate valid rows for the currently selected color
  const validRows = selectedColor 
    ? getValidRowsForColor(currentPlayer, selectedColor, gameState.variantGrayWall)
    : [false, false, false, false, false];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1e293b_0%,_#0f172a_45%,_#020617_100%)] text-slate-100 flex flex-col">
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/55 backdrop-blur-xl px-4 py-3 md:px-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <h1
              onClick={handleRestart}
              className="text-xl md:text-2xl font-black tracking-[0.2em] text-white cursor-pointer hover:text-indigo-200 transition-colors flex items-center gap-2"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-cyan-400 text-slate-950 text-base shadow-lg shadow-indigo-500/20">A</span>
              AZUL
              <span className="text-[11px] font-semibold text-slate-400 tracking-normal">アズール</span>
            </h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/5 text-slate-200 border border-white/10">
              ラウンド {gameState.round}
            </span>
            {gameState.variantGrayWall && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-pink-500/15 text-pink-200 border border-pink-400/20">
                グレイウォール
              </span>
            )}
            {gameState.variantSpecialFactories && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/20">
                特殊工場
              </span>
            )}
            {gameState.players.some(p => p.aiDifficulty === 'hard') && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-200 border border-rose-400/20" title="強化学習済みゲーム数">
                🧠 {getTrainingInfo().count}局学習済
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRulesOpen(true)}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold rounded-xl text-xs transition-all active:scale-95 border border-white/10"
            >
              📜 ルール
            </button>
            <button
              onClick={handleRestart}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 font-semibold rounded-xl text-xs transition-all active:scale-95 border border-rose-400/20"
            >
              🔄 終了
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 p-3 md:p-4 lg:p-5 flex flex-col xl:flex-row gap-4 xl:gap-5 max-w-[1800px] mx-auto w-full xl:max-h-[calc(100vh-76px)]">
        {/* Left Column */}
        <div className="flex-[1.15] flex flex-col gap-4 min-w-0 xl:overflow-y-auto xl:pr-1">
          {/* Phase Banner */}
          <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-500/10" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isHumanTurn ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]'}`} />
                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                    {gameState.phase === 'game_over' ? 'Game Over' : 'Current Turn'}
                  </div>
                  <div className="font-extrabold text-white text-base md:text-xl mt-0.5">
                    {gameState.phase === 'game_over' ? (
                      '👑 ゲーム終了！'
                    ) : (
                      <>
                        {currentPlayer.name}
                        <span className="font-medium text-slate-300 text-sm ml-2">
                          {isHumanTurn
                            ? 'の番です — タイルを選んで配置先を決めてください'
                            : currentPlayer.type === 'ai'
                            ? `の番です（${currentPlayer.aiDifficulty === 'hard' ? '🧠最強AI' : currentPlayer.aiDifficulty === 'normal' ? '💡中級AI' : '🎲初級AI'} 思考中...）`
                            : 'の番です'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selectedColor && isHumanTurn && (
                <div className="flex items-center gap-2 bg-indigo-500/15 border border-indigo-400/25 rounded-xl px-3 py-2 animate-in fade-in slide-in-from-right-5 duration-200 self-start md:self-auto">
                  <span className="text-xs font-bold text-indigo-200">選択中</span>
                  <Tile color={selectedColor} size="sm" />
                  <span className="text-xs text-slate-300">配置先をクリック</span>
                </div>
              )}
            </div>
          </div>

          {/* Plates */}
          <div className="rounded-2xl p-4 md:p-5 border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Factories</div>
                <div className="text-sm text-slate-300 mt-0.5">丸皿からタイルを獲得</div>
              </div>
              <div className="text-[11px] text-slate-500">{gameState.plates.length}枚の工場</div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-5">
              {gameState.plates.map((plate, idx) => {
                const isSelected =
                  selectedSource !== null &&
                  typeof selectedSource === 'object' &&
                  selectedSource.plateIndex === idx;
                return (
                  <Plate
                    key={plate.id}
                    plate={plate}
                    isSelected={isSelected}
                    selectedColor={selectedColor}
                    interactive={isHumanTurn}
                    onTileClick={(color) => handleTileSelect({ plateIndex: idx }, color)}
                  />
                );
              })}
            </div>
          </div>

          {/* Center Area */}
          <div className="rounded-2xl p-1 border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl">
            <CenterArea
              tiles={gameState.center.tiles}
              hasFirstPlayerTile={gameState.center.hasFirstPlayerTile}
              isSelected={selectedSource === 'center'}
              selectedColor={selectedColor}
              interactive={isHumanTurn}
              onTileClick={(color) => handleTileSelect('center', color)}
            />
          </div>

          {/* Game Log */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-md p-4 shadow-xl flex flex-col h-[170px] xl:h-[160px]">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
              <span>📝 Game Log</span>
              <span className="text-slate-500 normal-case tracking-normal">{gameState.log.length}件</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] leading-relaxed text-slate-300">
              {gameState.log.slice(-120).map((entry, idx) => {
                let textClass = 'text-slate-300/90';
                if (entry.includes('ゲームを開始')) textClass = 'text-indigo-300 font-bold';
                else if (entry.includes('ラウンド')) textClass = 'text-amber-300 font-bold mt-1';
                else if (entry.includes('完成！')) textClass = 'text-emerald-300';
                else if (entry.includes('ペナルティ')) textClass = 'text-rose-300';
                else if (entry.includes('獲得しました')) textClass = 'text-slate-400';
                else if (entry.includes('🏆 ゲーム終了')) textClass = 'text-pink-300 font-bold bg-pink-500/10 px-2 py-1 rounded-lg';
                else if (entry.startsWith('---')) textClass = 'text-cyan-300/90 font-semibold mt-1';
                else if (entry.startsWith('===')) textClass = 'text-amber-200 font-bold mt-1';
                return (
                  <div key={idx} className={`${textClass} transition-all duration-150`}>
                    {entry}
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Right Column: Players */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 xl:overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Player Boards</div>
              <div className="text-sm text-slate-300 mt-0.5">プレイヤーボード</div>
            </div>
            <div className="text-[11px] text-slate-500">{gameState.players.length}人対戦</div>
          </div>
          <div className={cn(
            "grid gap-3 xl:overflow-y-auto pr-1 xl:max-h-[calc(100vh-140px)]",
            gameState.players.length <= 2 ? "grid-cols-1 2xl:grid-cols-2" : "grid-cols-1 2xl:grid-cols-2"
          )}>
            {gameState.players.map((board, idx) => {
              const isActive = gameState.currentPlayerIndex === idx;
              const isPlacing = isActive && selectedSource !== null && selectedColor !== null;
              return (
                <div key={board.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300 min-w-0">
                  <Board
                    board={board}
                    isActive={isActive}
                    isPlacing={isPlacing}
                    isValidTargetRows={isActive ? validRows : [false, false, false, false, false]}
                    onRowClick={handleRowPlacement}
                    onFloorClick={handleFloorPlacement}
                    compact={gameState.players.length >= 2}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Game Over Screen Overlay */}
      {gameState.phase === 'game_over' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 rounded-3xl max-w-lg w-full border border-white/10 p-6 md:p-7 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center">
            <div className="space-y-1">
              <span className="text-5xl">👑</span>
              <h2 className="text-3xl font-black text-white tracking-tight">ゲーム終了</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Final Result</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-indigo-400/20 rounded-2xl p-5 w-full flex flex-col items-center gap-1.5">
              <span className="text-xs text-indigo-200 font-extrabold tracking-wider uppercase">Winner</span>
              <span className="text-2xl font-black text-white">
                {gameState.players.filter((p) => gameState.winnerIds.includes(p.id)).map((p) => p.name).join(', ')}
              </span>
              <span className="text-indigo-200 font-mono font-extrabold text-4xl mt-1">
                {Math.max(...gameState.players.map((p) => p.score))}<span className="text-sm font-sans font-bold text-slate-400 ml-1">点</span>
              </span>
            </div>

            <div className="w-full space-y-2">
              {[...gameState.players]
                .sort((a, b) => b.score - a.score || b.completedHorizontalRows - a.completedHorizontalRows)
                .map((player, idx) => {
                  const isWinner = gameState.winnerIds.includes(player.id);
                  return (
                    <div key={player.id} className={cn('flex justify-between items-center px-4 py-3 rounded-xl border', isWinner ? 'bg-amber-500/10 border-amber-400/30' : 'bg-white/[0.03] border-white/10')}>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-6 h-6 rounded-full text-xs flex items-center justify-center font-extrabold', idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-slate-300')}>{idx + 1}</span>
                        <span className="text-sm text-slate-200 font-medium">{player.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] text-slate-400 flex gap-2">
                          <span>横:{player.completedHorizontalRows}</span>
                          <span>縦:{player.completedVerticalRows}</span>
                          <span>色:{player.completedColors}</span>
                        </div>
                        <span className="font-mono font-extrabold text-white text-base">{player.score}点</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <button onClick={() => setGameState(null)} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg transition-all active:scale-95">
              🎮 タイトルへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
