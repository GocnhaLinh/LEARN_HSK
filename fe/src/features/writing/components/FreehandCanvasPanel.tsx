import { Eraser, Save } from 'lucide-react';
import React from 'react';
import { Button, Card, Input } from '@/components/ui';
import { INK_COLORS } from '@/features/writing/hooks/useFreehandCanvas';
import type { EffectCoords } from '@/lib/fx-utils';

interface FreehandCanvasPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  inkColor: string;
  brushSize: number;
  caption: string;
  isSaving: boolean;
  onInkColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onCaptionChange: (caption: string) => void;
  onClear: () => void;
  onSave: (coords?: EffectCoords) => void;
}

export const FreehandCanvasPanel: React.FC<FreehandCanvasPanelProps> = ({
  canvasRef,
  inkColor,
  brushSize,
  caption,
  isSaving,
  onInkColorChange,
  onBrushSizeChange,
  onCaptionChange,
  onClear,
  onSave,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <Card className="lg:col-span-5 space-y-4">
        <h3 className="font-serif font-bold text-lg">Bảng màu &amp; Bút viết tay</h3>

        <div>
          <p className="font-mono text-xs font-bold mb-2">Màu mực</p>
          <div className="flex flex-wrap gap-2">
            {INK_COLORS.map((ink) => (
              <Button
                key={ink.value}
                size="sm"
                onClick={() => onInkColorChange(ink.value)}
                style={{ backgroundColor: ink.value }}
                className={`text-white border-[#141414] hover:brightness-110 ${
                  inkColor === ink.value ? 'ring-2 ring-[#EFE078] ring-offset-1' : ''
                }`}
              >
                {ink.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between font-mono text-xs font-bold mb-1.5">
            <label htmlFor="brush-size-slider">Độ dày nét bút</label>
            <span>{brushSize} px</span>
          </div>
          <input
            id="brush-size-slider"
            type="range"
            min={3}
            max={20}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="w-full accent-[#111111]"
          />
        </div>

        <div>
          <label htmlFor="canvas-caption-input" className="font-mono text-xs font-bold block mb-1.5">
            Ghi chú cho ảnh lưu (tuỳ chọn)
          </label>
          <Input
            id="canvas-caption-input"
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="VD: Tập viết chữ 爱..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Button
            variant="default"
            onClick={onClear}
            leftIcon={<Eraser className="w-4 h-4" />}
            className="py-2.5 hover:bg-[#F4C2D7]"
          >
            Xóa bảng
          </Button>
          <Button
            variant="primary"
            disabled={isSaving}
            onClick={(e) => onSave({ clientX: e.clientX, clientY: e.clientY })}
            leftIcon={<Save className="w-4 h-4" />}
            className="py-2.5"
          >
            Lưu sổ tay
          </Button>
        </div>
      </Card>

      <Card padding="lg" className="lg:col-span-7 flex flex-col items-center">
        <p className="font-mono text-xs opacity-70 mb-4">
          Vẽ bằng chuột, ngón tay hoặc bút cảm ứng lên lưới 米字格
        </p>
        <div className="mizige-grid">
          <canvas ref={canvasRef} className="relative z-10 w-full h-full cursor-crosshair" />
        </div>
      </Card>
    </div>
  );
};
