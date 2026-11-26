import { Pencil, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const TAG_COLORS: Record<string, string> = {
  'Nhật ký': 'bg-[#F4C2D7]',
  'Ngữ pháp': 'bg-[#EFE078]',
  'Mẹo nhớ': 'bg-[#CBEAD8]',
};

export const NotesPage: React.FC = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { notes, saveNote, deleteNote } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('Nhật ký');
  const [content, setContent] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Sync route `/notes/:noteId/edit` to form
  useEffect(() => {
    if (!noteId) {
      setEditingId(null);
      return;
    }
    const found = notes.find((n) => n.id === noteId);
    if (found) {
      setEditingId(found.id);
      setTitle(found.title);
      setTag(found.tag);
      setContent(found.content);
      titleInputRef.current?.focus();
    }
  }, [noteId, notes]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setTag('Nhật ký');
    setContent('');
    if (noteId) navigate('/notes', { replace: true });
  };

  const insertSnippet = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((prev) => prev + snippet);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const nextVal = content.slice(0, start) + snippet + content.slice(end);
    setContent(nextVal);
    window.requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + snippet.length;
    });
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!title.trim() || !content.trim()) {
      await saveNote({ id: editingId, title, tag, content });
      return;
    }
    await saveNote(
      { id: editingId, title, tag, content },
      { clientX: e.clientX, clientY: e.clientY },
    );
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (editingId === id) resetForm();
    await deleteNote(id);
  };

  return (
    <section className="space-y-6">
      <div className="t-card-flat p-4">
        <p className="font-mono text-[11px] uppercase opacity-65">[07] MINDNOTES &amp; DIARY THEORY</p>
        <h2 className="font-serif font-bold text-2xl">Ghi chú ngữ pháp &amp; Nhật ký tiếng Trung</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 t-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg">
              {editingId ? 'Đang chỉnh sửa ghi chú' : 'Tạo ghi chú mới'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="font-mono text-xs underline opacity-75"
              >
                Hủy sửa
              </button>
            )}
          </div>

          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề (VD: Phân biệt 不 và 没, Nhật ký hôm nay...)"
            className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-sm font-medium outline-none"
          />

          <div className="flex items-center gap-2 font-mono text-xs">
            <label htmlFor="note-tag" className="font-bold">
              Thẻ:
            </label>
            <select
              id="note-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-bold outline-none"
            >
              <option value="Nhật ký">Nhật ký</option>
              <option value="Ngữ pháp">Ngữ pháp</option>
              <option value="Mẹo nhớ">Mẹo nhớ</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            <span className="opacity-65 self-center mr-1">Chèn nhanh:</span>
            {['，', '。', '？', '「」', '〔〕'].map((snip) => (
              <button
                key={snip}
                type="button"
                onClick={() => insertSnippet(snip)}
                className="t-btn px-2 py-0.5 bg-white text-[#111111]"
              >
                {snip}
              </button>
            ))}
            <button
              type="button"
              onClick={() => insertSnippet(`[${new Date().toLocaleDateString('vi-VN')}] `)}
              className="t-btn px-2 py-0.5 bg-[#EFE078] text-[#111111] font-bold"
            >
              + Ngày
            </button>
          </div>

          <textarea
            ref={textareaRef}
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết đoạn nhật ký tiếng Trung hoặc ghi chú ngữ pháp của bạn tại đây..."
            className="w-full p-3 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-sm leading-relaxed outline-none"
          />

          <button
            type="button"
            onClick={handleSave}
            className="t-btn-black w-full py-2.5 font-mono text-xs font-bold flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{editingId ? 'Cập nhật ghi chú' : 'Lưu ghi chú (+10 XP)'}</span>
          </button>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {!notes.length ? (
            <div className="t-card p-8 text-center font-mono text-xs opacity-65">
              Chưa có ghi chú nào. Hãy viết dòng nhật ký tiếng Trung đầu tiên!
            </div>
          ) : (
            notes.map((n) => (
              <article key={n.id} className="t-card p-5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold text-[#111111] t-badge ${
                        TAG_COLORS[n.tag] || 'bg-[#EFE078]'
                      }`}
                    >
                      {n.tag}
                    </span>
                    <span className="font-mono text-[11px] opacity-60">{n.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/notes/${encodeURIComponent(n.id)}/edit`)}
                      className="p-1.5 hover:opacity-70"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 text-red-700 hover:opacity-70"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="font-serif font-bold text-lg">{n.title}</h4>
                <p className="text-sm whitespace-pre-line leading-relaxed opacity-85">{n.content}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
