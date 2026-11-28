import { Trash2 } from 'lucide-react';
import React from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { useConfirmStore } from '@/stores/confirm.store';
import type { HandwritingItem } from '@/types';

interface HandwritingGalleryProps {
  items: HandwritingItem[];
  onDelete: (id: string) => void;
}

export const HandwritingGallery: React.FC<HandwritingGalleryProps> = ({ items, onDelete }) => {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-lg">Sổ tay chữ viết đã lưu</h3>
        <Badge variant="yellow" size="sm">
          {items.length} ảnh
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {!items.length ? (
          <p className="col-span-full text-xs opacity-65 py-4 text-center font-mono">
            Chưa có bài viết tay nào được lưu.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border-[1.5px] border-[#141414] rounded-xl bg-[#FFFEFA] p-2 flex flex-col gap-1.5"
            >
              <img
                src={item.img}
                alt={item.caption}
                className="w-full aspect-square object-contain border border-dashed border-stone-300 bg-white rounded"
              />
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium truncate">{item.caption}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    useConfirmStore.getState().openConfirm({
                      title: 'Xác nhận xóa ảnh viết tay?',
                      message: (
                        <p>
                          Bạn có chắc muốn xóa bài viết tay{' '}
                          <strong>“{item.caption || 'Không có tiêu đề'}”</strong> khỏi sổ tay không?
                        </p>
                      ),
                      confirmLabel: 'Xóa ảnh',
                      onConfirm: () => onDelete(item.id),
                    })
                  }
                  className="w-6 h-6 text-red-700 hover:bg-red-50 shrink-0"
                  title="Xóa ảnh"
                  aria-label="Xóa ảnh viết tay"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
