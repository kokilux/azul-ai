import React from 'react';
import { FactoryPlate, TileColor } from '../types/game';
import { Tile } from './Tile';
import { cn } from '../utils/cn';

interface PlateProps {
  plate: FactoryPlate;
  isSelected: boolean;
  selectedColor: TileColor | null;
  interactive: boolean;
  onTileClick: (color: TileColor) => void;
}

export const Plate: React.FC<PlateProps> = ({
  plate,
  isSelected,
  selectedColor,
  interactive,
  onTileClick,
}) => {
  const uniqueColors = Array.from(new Set(plate.tiles)) as TileColor[];

  // Render text for special factory
  const getSpecialLabel = () => {
    switch (plate.type) {
      case 'special_1':
        return '➕5枚';
      case 'special_2':
        const jpColors: Record<TileColor, string> = {
          red: '赤', blue: '青', yellow: '黄', black: '黒', cyan: '水色'
        };
        return `🧲${jpColors[plate.specialColor!]}`;
      case 'special_3':
        return '🛑残存';
      case 'special_4':
        return '↔️分割';
      case 'special_5':
        return '🛡️床化';
      default:
        return '';
    }
  };

  const getSpecialDescription = () => {
    switch (plate.type) {
      case 'special_1':
        return 'ラウンド開始時、袋からタイルを5枚引く';
      case 'special_2':
        const jpColors: Record<TileColor, string> = {
          red: '赤', blue: '青', yellow: '黄', black: '黒', cyan: '水色'
        };
        return `ラウンド開始時、隣接する皿から${jpColors[plate.specialColor!]}を奪う`;
      case 'special_3':
        return '選んだ色以外のタイルは場の中央に移動せず、この皿に残る';
      case 'special_4':
        return '選んだ色以外のタイルは中央に移動せず、左右の皿に分割される';
      case 'special_5':
        return '獲得時、余ったタイルは中央へ行き、この皿はペナルティ1回無効化アイテムとして獲得される';
      default:
        return '通常工場';
    }
  };

  return (
    <div
      className={cn(
        'relative w-28 h-28 md:w-36 md:h-36 rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.14),rgba(255,255,255,0.03)_45%,rgba(15,23,42,0.35)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_30px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all duration-200 p-2 backdrop-blur-sm',
        isSelected && 'border-indigo-400/70 scale-105 shadow-[0_0_0_1px_rgba(129,140,248,0.35),0_0_30px_rgba(99,102,241,0.25)]'
      )}
    >
      {/* Plate ID or Special Badge */}
      <div 
        className={cn(
          "absolute -top-1 -left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-sm z-20 select-none backdrop-blur-sm",
          plate.type === 'normal' 
            ? "bg-slate-900/80 text-slate-300 border-white/10" 
            : "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-300/40 font-extrabold"
        )}
        title={getSpecialDescription()}
      >
        {plate.type === 'normal' ? plate.id + 1 : getSpecialLabel()}
      </div>

      {plate.tiles.length === 0 ? (
        <span className="text-xs text-slate-500 select-none italic font-medium">空</span>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 p-2 justify-center items-center">
          {uniqueColors.map((color) => {
            const count = plate.tiles.filter((c) => c === color).length;
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
export default Plate;
