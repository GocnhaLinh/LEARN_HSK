import { Save } from 'lucide-react';
import React from 'react';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import { NOTE_SNIPPETS, NOTE_TAGS } from '@/features/notes/hooks/useNotes';
import type { EffectCoords } from '@/lib/fx-utils';

interface NoteEditorFormProps {
  editingId: string | null;
  title: string;
  tag: string;
  content: string;
  isSaving: boolean;
  titleInputRef: React.RefObject<HTMLInputElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onTitleChange: (val: string) => void;
  onTagChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onInsertSnippet: (snippet: string) => void;
  onReset: () => void;
  onSave: (coords?: EffectCoords) => void;
}

export const NoteEditorForm: React.FC<NoteEditorFormProps> = ({
  editingId,
  title,
  tag,
  content,
  isSaving,
  titleInputRef,
  textareaRef,
  onTitleChange,
  onTagChange,
  onContentChange,
  onInsertSnippet,
  onReset,
  onSave,
}) => {
  return (
    <Card className="lg:col-span-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-lg">
          {editingId ? 'Đang chỉnh sửa ghi chú' : 'Tạo ghi chú mới'}
        </h3>
        {editingId && (
          <button
            type="button"
            onClick={onReset}
            className="font-mono text-xs underline opacity-75 hover:opacity-100"
          >
            Hủy sửa
          </button>
        )}
      </div>

      <Input
        ref={titleInputRef}
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Tiêu đề (VD: Phân biệt 不 và 没, Nhật ký hôm nay...)"
        className="font-medium"
      />

      <div className="flex items-center gap-2 font-mono text-xs">
        <label htmlFor="note-tag" className="font-bold shrink-0">
          Thẻ:
        </label>
        <Select
          id="note-tag"
          selectSize="sm"
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          className="flex-1 min-w-0"
        >
          {NOTE_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5 font-mono text-xs">
        <span className="opacity-65 self-center mr-1">Chèn nhanh:</span>
        {NOTE_SNIPPETS.map((snip) => (
          <Button
            key={snip}
            size="xs"
            variant="default"
            onClick={() => onInsertSnippet(snip)}
            className="px-2 py-0.5 font-normal"
          >
            {snip}
          </Button>
        ))}
        <Button
          size="xs"
          variant="yellow"
          onClick={() => onInsertSnippet(`[${new Date().toLocaleDateString('vi-VN')}] `)}
          className="px-2 py-0.5"
        >
          + Ngày
        </Button>
      </div>

      <Textarea
        ref={textareaRef}
        rows={6}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Viết đoạn nhật ký tiếng Trung hoặc ghi chú ngữ pháp của bạn tại đây..."
        className="leading-relaxed"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={isSaving}
        leftIcon={<Save className="w-4 h-4" />}
        onClick={(e) => onSave({ clientX: e.clientX, clientY: e.clientY })}
      >
        {editingId ? 'Cập nhật ghi chú' : 'Lưu ghi chú (+10 XP)'}
      </Button>
    </Card>
  );
};
