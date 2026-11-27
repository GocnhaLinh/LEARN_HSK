import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { HSK_LEVELS, VOCAB_STATUS_LABELS } from '@/data/defaults';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';
import type { VocabFormInput } from '@/features/vocab/types';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { VocabStatus } from '@/types';

const STATUS_ORDER: ReadonlyArray<VocabStatus> = ['new', 'learning', 'review', 'mastered'];

const EMPTY_FORM: VocabFormInput = {
  hanzi: '',
  pinyin: '',
  hanviet: '',
  english: '',
  pos: 'Danh từ',
  level: 5,
  status: 'new',
  meaning: '',
  note: '',
  exampleZh: '',
  exampleVi: '',
};

interface VocabWordModalProps {
  defaultLevel?: number;
  onSave: (data: VocabFormInput, editingId?: string) => Promise<void>;
}

export const VocabWordModal: React.FC<VocabWordModalProps> = ({ defaultLevel = 5, onSave }) => {
  const open = useVocabUiStore((s) => s.modalOpen);
  const editingWord = useVocabUiStore((s) => s.editingWord);
  const closeModal = useVocabUiStore((s) => s.closeModal);

  const [form, setForm] = useState<VocabFormInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      editingWord
        ? {
            hanzi: editingWord.hanzi || '',
            pinyin: editingWord.pinyin || '',
            hanviet: editingWord.hanviet || '',
            english: editingWord.english || '',
            pos: editingWord.pos || 'Từ vựng',
            level: editingWord.level || 5,
            status: editingWord.status || 'new',
            meaning: editingWord.meaning || '',
            note: editingWord.note || '',
            exampleZh: editingWord.exampleZh || '',
            exampleVi: editingWord.exampleVi || '',
          }
        : { ...EMPTY_FORM, level: defaultLevel },
    );
  }, [open, editingWord, defaultLevel]);

  useEscapeKey(open, closeModal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hanzi.trim() || !form.pinyin.trim() || !form.meaning.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(form, editingWord?.id);
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      subtitle={editingWord ? `CHỈNH SỬA • HSK ${editingWord.level}` : 'THÊM TỪ MỚI VÀO MONGODB'}
      title={editingWord ? `Sửa từ "${editingWord.hanzi}"` : 'Thêm từ vựng thủ công'}
    >
      <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Chữ Hán *</label>
            <Input
              required
              value={form.hanzi}
              onChange={(e) => setForm({ ...form, hanzi: e.target.value })}
              placeholder="VD: 咖啡"
              className="font-serifcn text-base"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Pinyin *</label>
            <Input
              required
              value={form.pinyin}
              onChange={(e) => setForm({ ...form, pinyin: e.target.value })}
              placeholder="VD: kāfēi"
              className="font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Nghĩa tiếng Việt *</label>
            <Input
              required
              value={form.meaning}
              onChange={(e) => setForm({ ...form, meaning: e.target.value })}
              placeholder="VD: Cà phê"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Nghĩa tiếng Anh</label>
            <Input
              value={form.english || ''}
              onChange={(e) => setForm({ ...form, english: e.target.value })}
              placeholder="VD: coffee"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Âm Hán Việt</label>
            <Input
              value={form.hanviet || ''}
              onChange={(e) => setForm({ ...form, hanviet: e.target.value })}
              placeholder="CA PHÊ"
              className="px-2.5 text-xs"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Từ loại</label>
            <Input
              value={form.pos || ''}
              onChange={(e) => setForm({ ...form, pos: e.target.value })}
              placeholder="Danh từ"
              className="px-2.5 text-xs"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Cấp HSK</label>
            <Select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
              className="w-full px-2 py-2"
            >
              {HSK_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  HSK {lv}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Trạng thái</label>
            <Select
              value={form.status || 'new'}
              onChange={(e) => setForm({ ...form, status: e.target.value as VocabStatus })}
              className="w-full px-2 py-2"
            >
              {STATUS_ORDER.map((st) => (
                <option key={st} value={st}>
                  {VOCAB_STATUS_LABELS[st]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="font-mono text-[11px] font-bold block mb-1">Câu ví dụ tiếng Trung</label>
          <Input
            value={form.exampleZh || ''}
            onChange={(e) => setForm({ ...form, exampleZh: e.target.value })}
            placeholder="VD: 我喜欢喝咖啡。"
            className="font-serifcn"
          />
        </div>

        <div>
          <label className="font-mono text-[11px] font-bold block mb-1">Dịch ví dụ tiếng Việt</label>
          <Input
            value={form.exampleVi || ''}
            onChange={(e) => setForm({ ...form, exampleVi: e.target.value })}
            placeholder="VD: Tôi thích uống cà phê."
          />
        </div>

        <div>
          <label className="font-mono text-[11px] font-bold block mb-1">Ghi chú &amp; Mẹo nhớ</label>
          <Textarea
            rows={2}
            value={form.note || ''}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Chiết tự, cách dùng đặc biệt hoặc mẹo ghi nhớ..."
            className="text-xs resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-dashed border-current/15">
          <Button variant="default" onClick={closeModal}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saving} className="px-5">
            {saving ? 'Đang lưu...' : editingWord ? 'Lưu thay đổi' : 'Lưu vào kho từ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
