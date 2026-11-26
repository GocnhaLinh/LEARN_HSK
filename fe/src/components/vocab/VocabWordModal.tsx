import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { VocabFormInput } from '../../context/AppContext';
import { VocabStatus, VocabWord } from '../../types';

interface VocabWordModalProps {
  open: boolean;
  editingWord: VocabWord | null;
  defaultLevel?: number;
  onClose: () => void;
  onSave: (data: VocabFormInput, editingId?: string) => Promise<void>;
}

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

export const VocabWordModal: React.FC<VocabWordModalProps> = ({
  open,
  editingWord,
  defaultLevel = 5,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<VocabFormInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingWord) {
      setForm({
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
      });
    } else {
      setForm({ ...EMPTY_FORM, level: defaultLevel });
    }
  }, [open, editingWord, defaultLevel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hanzi.trim() || !form.pinyin.trim() || !form.meaning.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(form, editingWord?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="t-card w-full max-w-xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-current/15">
          <div>
            <p className="font-mono text-[10px] uppercase opacity-60">
              {editingWord ? `CHỈNH SỬA • HSK ${editingWord.level}` : 'THÊM TỪ MỚI VÀO MONGODB'}
            </p>
            <h3 className="font-serif font-bold text-xl">
              {editingWord ? `Sửa từ "${editingWord.hanzi}"` : 'Thêm từ vựng thủ công'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Chữ Hán *</label>
              <input
                required
                type="text"
                value={form.hanzi}
                onChange={(e) => setForm({ ...form, hanzi: e.target.value })}
                placeholder="VD: 咖啡"
                className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-serifcn text-base outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Pinyin *</label>
              <input
                required
                type="text"
                value={form.pinyin}
                onChange={(e) => setForm({ ...form, pinyin: e.target.value })}
                placeholder="VD: kāfēi"
                className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Nghĩa tiếng Việt *</label>
              <input
                required
                type="text"
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                placeholder="VD: Cà phê"
                className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Nghĩa tiếng Anh</label>
              <input
                type="text"
                value={form.english || ''}
                onChange={(e) => setForm({ ...form, english: e.target.value })}
                placeholder="VD: coffee"
                className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Âm Hán Việt</label>
              <input
                type="text"
                value={form.hanviet || ''}
                onChange={(e) => setForm({ ...form, hanviet: e.target.value })}
                placeholder="CA PHÊ"
                className="w-full px-2.5 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Từ loại</label>
              <input
                type="text"
                value={form.pos || ''}
                onChange={(e) => setForm({ ...form, pos: e.target.value })}
                placeholder="Danh từ"
                className="w-full px-2.5 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Cấp HSK</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                className="w-full px-2 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
              >
                <option value={1}>HSK 1</option>
                <option value={2}>HSK 2</option>
                <option value={3}>HSK 3</option>
                <option value={4}>HSK 4</option>
                <option value={5}>HSK 5</option>
                <option value={6}>HSK 6</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[11px] font-bold block mb-1">Trạng thái</label>
              <select
                value={form.status || 'new'}
                onChange={(e) => setForm({ ...form, status: e.target.value as VocabStatus })}
                className="w-full px-2 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
              >
                <option value="new">Từ mới</option>
                <option value="learning">Đang học</option>
                <option value="review">Cần chú ý</option>
                <option value="mastered">Đã thuộc</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Câu ví dụ tiếng Trung</label>
            <input
              type="text"
              value={form.exampleZh || ''}
              onChange={(e) => setForm({ ...form, exampleZh: e.target.value })}
              placeholder="VD: 我喜欢喝咖啡。"
              className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-serifcn outline-none"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Dịch ví dụ tiếng Việt</label>
            <input
              type="text"
              value={form.exampleVi || ''}
              onChange={(e) => setForm({ ...form, exampleVi: e.target.value })}
              placeholder="VD: Tôi thích uống cà phê."
              className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded outline-none"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] font-bold block mb-1">Ghi chú &amp; Mẹo nhớ</label>
            <textarea
              rows={2}
              value={form.note || ''}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Chiết tự, cách dùng đặc biệt hoặc mẹo ghi nhớ..."
              className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-xs outline-none resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-dashed border-current/15">
            <button
              type="button"
              onClick={onClose}
              className="t-btn px-4 py-2 bg-white text-[#111111] font-mono text-xs font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="t-btn-black px-5 py-2 font-mono text-xs font-bold disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : editingWord ? 'Lưu thay đổi' : 'Lưu vào kho từ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
