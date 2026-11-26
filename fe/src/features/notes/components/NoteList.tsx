import { NotebookPen, Pencil, Trash2 } from 'lucide-react';
import React from 'react';
import { Badge, BadgeVariant, Button, Card, EmptyState } from '@/components/ui';
import { NOTE_TAGS } from '@/features/notes/hooks/useNotes';
import type { MindNote } from '@/types';

const TAG_VARIANT: Record<string, BadgeVariant> = {
  'Nhật ký': 'pink',
  'Ngữ pháp': 'yellow',
  'Mẹo nhớ': 'mint',
};

interface NoteListProps {
  notes: MindNote[];
  totalCount: number;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  totalCount,
  tagFilter,
  onTagFilterChange,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="lg:col-span-7 space-y-3">
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {['all', ...NOTE_TAGS].map((t) => {
            const active = tagFilter === t;
            return (
              <Button
                key={t}
                size="xs"
                variant={active ? 'primary' : 'default'}
                onClick={() => onTagFilterChange(t)}
              >
                {t === 'all' ? `Tất cả (${totalCount})` : t}
              </Button>
            );
          })}
        </div>
      )}

      {!notes.length ? (
        <Card padding="none">
          <EmptyState
            icon={<NotebookPen className="w-8 h-8" />}
            title={totalCount === 0 ? 'Chưa có ghi chú nào' : 'Không có ghi chú thuộc thẻ này'}
            description={
              totalCount === 0
                ? 'Hãy viết dòng nhật ký tiếng Trung hoặc ghi chú ngữ pháp đầu tiên ở khung bên trái!'
                : 'Chọn "Tất cả" để xem lại toàn bộ ghi chú của bạn.'
            }
          />
        </Card>
      ) : (
        notes.map((n) => (
          <Card key={n.id} className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge size="xs" variant={TAG_VARIANT[n.tag] || 'yellow'}>
                  {n.tag}
                </Badge>
                <span className="font-mono text-[11px] opacity-60">{n.date}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(n.id)}
                  title="Chỉnh sửa"
                  aria-label="Chỉnh sửa ghi chú"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(n.id)}
                  title="Xóa"
                  aria-label="Xóa ghi chú"
                  className="text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <h4 className="font-serif font-bold text-lg">{n.title}</h4>
            <p className="text-sm whitespace-pre-line leading-relaxed opacity-85">{n.content}</p>
          </Card>
        ))
      )}
    </div>
  );
};
