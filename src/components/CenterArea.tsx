import React from 'react';
import { TileColor } from '../types/game';
import { Tile } from './Tile';
import { cn } from '../utils/cn';

interface CenterAreaProps {
  tiles: TileColor[];
  hasFirstPlayerTile: boolean;
  isSelected: boolean;
  selectedColor: TileColor | null;
  interactive: boolean;
  onTileClick: (color: TileColor) => void;
}

export const CenterArea: React.FC<CenterAreaProps> = ({
  tiles,
  hasFirstPlayerTile,
  isSelected,
  selectedColor,
  interactive,
  onTileClick,
}) => {
  const uniqueColors = Array.from(new Set(tiles)) as TileColor[];
  const isEmpty = tiles.length === 0 && !hasFirstPlayerTile;

  return (
    <div
      className={cn(
        'relative min-h-[120px] w-full rounded-2xl border border-dashed border-white/15 bg-slate-950/20 p-5 pt-7 flex flex-wrap items-center justify-center gap-4 transition-all',
        isSelected && 'border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(129,140,248,0.25),0_12px_40px_rgba(79,70,229,0.15)]'
      )}
    >
      <div className="absolute top-2 left-4 px-2.5 py-1 text-[11px] text-slate-300 font-bold bg-white/5 border border-white/10 rounded-full select-none backdrop-blur-sm">
        場の中央 / Center
      </div>

      {isEmpty ? (
        <span className="text-sm text-slate-500 select-none italic">タイルなし</span>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {hasFirstPlayerTile && (
            <Tile color="first" size="md" />
          )}

          {uniqueColors.map((color) => {
            const count = tiles.filter((c) => c === color).length;
            const isColorSelected = isSelected && selectedColor === color;

            return (
              <Tile
                key={color}
                color={color}
                count={count}
                size="md"
                interactive={interactive}
                selected={isColorSelected}
                onClick={() => interactive && onTileClick(color)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
export default CenterArea;
