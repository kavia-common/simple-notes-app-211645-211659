import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'retro-notes:v1';

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {number} updatedAt
 */

function createNewNote() {
  const now = Date.now();
  return {
    id: `note_${now}_${Math.random().toString(16).slice(2)}`,
    title: 'Untitled note',
    body: '',
    updatedAt: now,
  };
}

function safeParseNotes(json) {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => n && typeof n === 'object')
      .map((n) => ({
        id: String(n.id ?? `note_${Math.random().toString(16).slice(2)}`),
        title: typeof n.title === 'string' ? n.title : 'Untitled note',
        body: typeof n.body === 'string' ? n.body : '',
        updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

function formatUpdatedAt(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// PUBLIC_INTERFACE
function App() {
  /** @type {[Note[], Function]} */
  const [notes, setNotes] = useState(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const loaded = safeParseNotes(raw || '[]');
    if (loaded.length > 0) return loaded;

    // First run: create a single welcome note for guidance.
    const welcome = createNewNote();
    welcome.title = 'Welcome';
    welcome.body =
      'This is a simple retro notes app.\n\n• Create notes\n• Edit on the right\n• Delete notes\n\nYour notes are saved locally in this browser.';
    return [welcome];
  });

  const [selectedId, setSelectedId] = useState(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const loaded = safeParseNotes(raw || '[]');
    return loaded[0]?.id || null;
  });

  const [query, setQuery] = useState('');

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return list;
    return list.filter((n) => {
      const hay = `${n.title}\n${n.body}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notes, query]);

  // Persist notes to localStorage.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  // Ensure a valid selected note id (e.g., after delete).
  useEffect(() => {
    if (selectedId && notes.some((n) => n.id === selectedId)) return;
    setSelectedId(notes[0]?.id || null);
  }, [notes, selectedId]);

  // PUBLIC_INTERFACE
  const handleCreateNote = () => {
    const n = createNewNote();
    setNotes((prev) => [n, ...prev]);
    setSelectedId(n.id);
  };

  // PUBLIC_INTERFACE
  const handleDeleteSelected = () => {
    if (!selectedNote) return;

    const ok = window.confirm(`Delete "${selectedNote.title}"? This cannot be undone.`);
    if (!ok) return;

    setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
  };

  const updateSelected = (patch) => {
    if (!selectedNote) return;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedNote.id) return n;
        return {
          ...n,
          ...patch,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const handleTitleChange = (e) => updateSelected({ title: e.target.value || 'Untitled note' });
  const handleBodyChange = (e) => updateSelected({ body: e.target.value });

  return (
    <div className="RetroApp">
      <header className="TopBar">
        <div className="TopBar__brand">
          <span className="TopBar__dot" aria-hidden="true" />
          <h1 className="TopBar__title">Retro Notes</h1>
          <span className="TopBar__tag">local</span>
        </div>

        <div className="TopBar__actions">
          <button className="Btn Btn--primary" type="button" onClick={handleCreateNote}>
            + New note
          </button>
          <button
            className="Btn Btn--danger"
            type="button"
            onClick={handleDeleteSelected}
            disabled={!selectedNote}
          >
            Delete
          </button>
        </div>
      </header>

      <main className="MainSplit" aria-label="Notes workspace">
        <section className="Sidebar" aria-label="Notes list">
          <div className="Sidebar__search">
            <label className="Label" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              className="Input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find notes..."
              type="search"
            />
          </div>

          <div className="Sidebar__list" role="listbox" aria-label="Notes">
            {filteredNotes.length === 0 ? (
              <div className="EmptyState" role="status">
                No notes match your search.
              </div>
            ) : (
              filteredNotes.map((n) => {
                const active = n.id === selectedId;
                const preview =
                  (n.body || '').trim().split('\n').find(Boolean) || 'No content yet…';
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`NoteRow ${active ? 'NoteRow--active' : ''}`}
                    onClick={() => setSelectedId(n.id)}
                    role="option"
                    aria-selected={active}
                  >
                    <div className="NoteRow__title">{n.title || 'Untitled note'}</div>
                    <div className="NoteRow__meta">
                      <span className="NoteRow__time">{formatUpdatedAt(n.updatedAt)}</span>
                      <span className="NoteRow__sep" aria-hidden="true">
                        •
                      </span>
                      <span className="NoteRow__preview">{preview}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="Editor" aria-label="Note editor">
          {!selectedNote ? (
            <div className="Editor__empty" role="status">
              <h2 className="Editor__emptyTitle">No note selected</h2>
              <p className="Editor__emptyText">Create a new note or pick one from the list.</p>
              <button className="Btn Btn--primary" type="button" onClick={handleCreateNote}>
                + New note
              </button>
            </div>
          ) : (
            <form className="Editor__form" onSubmit={(e) => e.preventDefault()}>
              <div className="Editor__field">
                <label className="Label" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  className="Input Input--title"
                  value={selectedNote.title}
                  onChange={handleTitleChange}
                  placeholder="Untitled note"
                  autoComplete="off"
                />
              </div>

              <div className="Editor__field Editor__field--grow">
                <label className="Label" htmlFor="body">
                  Note
                </label>
                <textarea
                  id="body"
                  className="Textarea"
                  value={selectedNote.body}
                  onChange={handleBodyChange}
                  placeholder="Type your note here..."
                  spellCheck
                />
              </div>

              <div className="Editor__footer" aria-label="Note info">
                <div className="Editor__hint">
                  Saved locally • Updated {formatUpdatedAt(selectedNote.updatedAt)}
                </div>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
