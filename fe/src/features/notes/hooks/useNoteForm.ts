import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NOTE_TAGS,
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
} from '@/features/notes/hooks/useNotes';
import type { EffectCoords } from '@/lib/fx-utils';
import { useToastStore } from '@/stores/toast.store';
import type { MindNote } from '@/types';

export function useNoteForm(notes: MindNote[], routeNoteId?: string) {
  const navigate = useNavigate();
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<string>(NOTE_TAGS[0]);
  const [content, setContent] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!routeNoteId) {
      setEditingId(null);
      return;
    }
    const found = notes.find((n) => n.id === routeNoteId);
    if (found) {
      setEditingId(found.id);
      setTitle(found.title);
      setTag(found.tag);
      setContent(found.content);
      titleInputRef.current?.focus();
    }
  }, [routeNoteId, notes]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setTag(NOTE_TAGS[0]);
    setContent('');
    if (routeNoteId) navigate('/notes', { replace: true });
  }, [navigate, routeNoteId]);

  const insertSnippet = useCallback((snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((prev) => prev + snippet);
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    setContent((prev) => prev.slice(0, start) + snippet + prev.slice(end));
    window.requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + snippet.length;
    });
  }, []);

  const handleSave = useCallback(
    async (coords?: EffectCoords) => {
      const cleanTitle = title.trim();
      const cleanContent = content.trim();
      if (!cleanTitle || !cleanContent) {
        useToastStore
          .getState()
          .showToast('Vui lòng nhập đủ tiêu đề và nội dung ghi chú.', 'pink');
        return;
      }

      const payload = { title: cleanTitle, tag, content: cleanContent };
      try {
        if (editingId) {
          await updateMutation.mutateAsync({ id: editingId, payload });
        } else {
          await createMutation.mutateAsync({ payload, coords });
        }
      } catch {
        // Offline optimistic state already handled in mutation onError
      }
      resetForm();
    },
    [content, createMutation, editingId, resetForm, tag, title, updateMutation],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (editingId === id) resetForm();
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
        // Offline optimistic state already handled in mutation onError
      }
    },
    [deleteMutation, editingId, resetForm],
  );

  const handleEdit = useCallback(
    (id: string) => {
      navigate(`/notes/${encodeURIComponent(id)}/edit`);
    },
    [navigate],
  );

  const filteredNotes =
    tagFilter === 'all' ? notes : notes.filter((n) => n.tag === tagFilter);

  return {
    editingId,
    title,
    setTitle,
    tag,
    setTag,
    content,
    setContent,
    tagFilter,
    setTagFilter,
    filteredNotes,
    textareaRef,
    titleInputRef,
    isSaving: createMutation.isPending || updateMutation.isPending,
    resetForm,
    insertSnippet,
    handleSave,
    handleDelete,
    handleEdit,
  };
}
