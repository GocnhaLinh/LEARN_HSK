import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui';
import { NoteEditorForm } from '@/features/notes/components/NoteEditorForm';
import { NoteList } from '@/features/notes/components/NoteList';
import { useNoteForm } from '@/features/notes/hooks/useNoteForm';
import { useNotes } from '@/features/notes/hooks/useNotes';

export const NotesPage: React.FC = () => {
  const { noteId } = useParams();
  const { data: notes = [] } = useNotes();
  const form = useNoteForm(notes, noteId);

  return (
    <section className="space-y-6">
      <Card variant="flat" padding="sm">
        <p className="font-mono text-[11px] uppercase opacity-65">[07] MINDNOTES &amp; DIARY THEORY</p>
        <h2 className="font-serif font-bold text-2xl">Ghi chú ngữ pháp &amp; Nhật ký tiếng Trung</h2>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <NoteEditorForm
          editingId={form.editingId}
          title={form.title}
          tag={form.tag}
          content={form.content}
          isSaving={form.isSaving}
          titleInputRef={form.titleInputRef}
          textareaRef={form.textareaRef}
          onTitleChange={form.setTitle}
          onTagChange={form.setTag}
          onContentChange={form.setContent}
          onInsertSnippet={form.insertSnippet}
          onReset={form.resetForm}
          onSave={form.handleSave}
        />

        <NoteList
          notes={form.filteredNotes}
          totalCount={notes.length}
          tagFilter={form.tagFilter}
          onTagFilterChange={form.setTagFilter}
          onEdit={form.handleEdit}
          onDelete={form.handleDelete}
        />
      </div>
    </section>
  );
};
