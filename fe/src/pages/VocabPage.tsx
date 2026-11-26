import { Download, PenTool, Plus, Search, Trash2, Upload, Volume2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { VocabStatus } from '../types';
import { normalizeSearch, speakChinese } from '../utils/helpers';

export const VocabPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    vocab,
    changeWordStatus,
    addCustomWord,
    deleteCustomWord,
    exportDataJSON,
    importDataJSON,
    showToast,
  } = useApp();

  const search = searchParams.get('q') || '';
  const levelFilter = searchParams.get('level') || 'all';
  const statusFilter = searchParams.get('status') || 'all';

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    hanzi: '',
    pinyin: '',
    hanviet: '',
    pos: 'Danh từ',
    level: 5,
    meaning: '',
    exampleZh: '',
    exampleVi: '',
  });

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'all') next.delete(key);
    else next.set(key, val);
    setSearchParams(next, { replace: true });
  };

  const filteredList = useMemo(() => {
    const q = normalizeSearch(search.trim());
    return vocab.filter((w) => {
      if (levelFilter !== 'all' && String(w.level) !== levelFilter) return false;
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (q) {
        return (
          w.hanzi.includes(q) ||
          normalizeSearch(w.pinyin).includes(q) ||
          normalizeSearch(w.hanviet).includes(q) ||
          normalizeSearch(w.meaning).includes(q)
        );
      }
      return true;
    });
  }, [vocab, search, levelFilter, statusFilter]);

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hanzi.trim() || !form.pinyin.trim() || !form.meaning.trim()) return;
    await addCustomWord(form);
    setForm({
      hanzi: '',
      pinyin: '',
      hanviet: '',
      pos: 'Danh từ',
      level: 5,
      meaning: '',
      exampleZh: '',
      exampleVi: '',
    });
    setModalOpen(false);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      importDataJSON(String(ev.target?.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section className="space-y-5">
      <div className="t-card-flat p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">
            [06] VOCABULARY ARCHIVE &amp; BACKUP
          </p>
          <h2 className="font-serif font-bold text-2xl">
            Kho từ HSK 3.0 (<span>{vocab.length}</span> từ)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="t-btn-black px-3.5 py-2 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm từ thủ công</span>
          </button>
          <button
            type="button"
            onClick={exportDataJSON}
            className="t-btn px-3.5 py-2 bg-[#EFE078] text-[#111111] flex items-center gap-1.5 hover:brightness-95"
          >
            <Download className="w-4 h-4" />
            <span>Xuất JSON</span>
          </button>
          <label className="t-btn px-3.5 py-2 bg-white text-[#111111] flex items-center gap-1.5 cursor-pointer hover:bg-[#F4C2D7]">
            <Upload className="w-4 h-4" />
            <span>Nhập JSON</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportJsonFile} />
          </label>
        </div>
      </div>

      {/* Callout guiding users to Courses for DOCX/PDF import */}
      <div className="t-card-flat px-4 py-3 bg-[#F4C2D7]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm">
          <span className="text-lg">📄</span>
          <span>
            Muốn tải file giáo trình <strong>.DOCX / .PDF</strong> để tự động trích xuất từ vựng? Hãy mở
            một khóa học trong mục <strong>Khóa học HSK</strong> nhé!
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/courses')}
          className="t-btn px-3.5 py-1.5 bg-white text-[#111111] font-mono text-xs font-bold shrink-0 hover:bg-[#EFE078]"
        >
          Đi tới Khóa học HSK →
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="t-card p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Tìm chữ Hán, Pinyin, âm Hán Việt hoặc nghĩa tiếng Việt..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-sm outline-none"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={levelFilter}
            onChange={(e) => updateParam('level', e.target.value)}
            className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
          >
            <option value="all">Tất cả cấp độ (HSK 1–6)</option>
            <option value="1">HSK 1 (Sơ cấp)</option>
            <option value="2">HSK 2 (Sơ cấp)</option>
            <option value="3">HSK 3 (Sơ cấp)</option>
            <option value="4">HSK 4 (Trung cấp)</option>
            <option value="5">HSK 5 (Trung cấp — Đang học)</option>
            <option value="6">HSK 6 (Trung cấp)</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => updateParam('status', e.target.value)}
            className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="mastered">Đã thuộc</option>
            <option value="learning">Đang học</option>
            <option value="review">Cần chú ý</option>
            <option value="new">Từ mới</option>
          </select>
        </div>
      </div>

      <div className="t-card overflow-hidden">
        <div className="divide-y divide-current/15">
          {!filteredList.length ? (
            <div className="p-10 text-center font-mono text-xs opacity-65">
              Không tìm thấy từ vựng phù hợp.
            </div>
          ) : (
            filteredList.map((w) => (
              <div
                key={w.id}
                className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start md:items-center hover:bg-black/[0.02] transition"
              >
                <div className="md:col-span-3 flex items-baseline gap-2.5">
                  <span className="font-serifcn text-2xl font-bold">{w.hanzi}</span>
                  <span className="font-mono text-xs opacity-70">{w.pinyin}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="px-2 py-0.5 bg-[#F8F6F1] border border-[#141414] rounded-[4px] font-mono text-[10px] font-bold text-[#141414]">
                    {w.hanviet || '—'}
                  </span>
                  <span className="ml-1 font-mono text-[10px] opacity-60">HSK {w.level}</span>
                </div>
                <div className="md:col-span-4 text-sm font-medium">{w.meaning}</div>
                <div className="md:col-span-3 flex items-center md:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => speakChinese(w.hanzi, 0.92, (m) => showToast(m, 'pink'))}
                    className="t-btn-black w-8 h-8 flex items-center justify-center shrink-0"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/writing/hanzi/${encodeURIComponent(Array.from(w.hanzi)[0])}`)
                    }
                    className="t-btn w-8 h-8 bg-white text-[#111111] flex items-center justify-center shrink-0 hover:bg-[#EFE078]"
                    title="Luyện viết"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={w.status}
                    onChange={(e) => changeWordStatus(w.id, e.target.value as VocabStatus)}
                    className="px-2 py-1.5 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-[11px] font-bold text-[#141414] outline-none"
                  >
                    <option value="mastered">Đã thuộc</option>
                    <option value="learning">Đang học</option>
                    <option value="review">Cần chú ý</option>
                    <option value="new">Từ mới</option>
                  </select>
                  {w.custom && (
                    <button
                      type="button"
                      onClick={() => deleteCustomWord(w.id)}
                      className="text-red-700 p-1 hover:opacity-70"
                      title="Xóa từ cá nhân"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: THÊM TỪ THỦ CÔNG */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="t-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-current/15">
              <h3 className="font-serif font-bold text-xl">Thêm từ vựng thủ công</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 hover:opacity-70">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-3 text-sm" onSubmit={handleSubmitWord}>
              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[11px] font-bold block mb-1">Âm Hán Việt</label>
                  <input
                    type="text"
                    value={form.hanviet}
                    onChange={(e) => setForm({ ...form, hanviet: e.target.value })}
                    placeholder="VD: CA PHÊ"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[11px] font-bold block mb-1">Từ loại &amp; Cấp HSK</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={form.pos}
                      onChange={(e) => setForm({ ...form, pos: e.target.value })}
                      className="w-1/2 px-2 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-xs outline-none"
                    />
                    <select
                      value={form.level}
                      onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                      className="w-1/2 px-2 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
                    >
                      <option value={1}>HSK 1</option>
                      <option value={2}>HSK 2</option>
                      <option value={3}>HSK 3</option>
                      <option value={4}>HSK 4</option>
                      <option value={5}>HSK 5</option>
                      <option value={6}>HSK 6</option>
                    </select>
                  </div>
                </div>
              </div>

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
                <label className="font-mono text-[11px] font-bold block mb-1">Câu ví dụ tiếng Trung</label>
                <input
                  type="text"
                  value={form.exampleZh}
                  onChange={(e) => setForm({ ...form, exampleZh: e.target.value })}
                  placeholder="VD: 我喜欢喝咖啡。"
                  className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-serifcn outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] font-bold block mb-1">Dịch ví dụ tiếng Việt</label>
                <input
                  type="text"
                  value={form.exampleVi}
                  onChange={(e) => setForm({ ...form, exampleVi: e.target.value })}
                  placeholder="VD: Tôi thích uống cà phê."
                  className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="t-btn px-4 py-2 bg-white text-[#111111] font-mono text-xs font-bold"
                >
                  Hủy
                </button>
                <button type="submit" className="t-btn-black px-5 py-2 font-mono text-xs font-bold">
                  Lưu vào kho từ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
