
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import { type Note } from './types';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import InstallPWA from './components/InstallPWA';

function App() {
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
  const navigate = useNavigate();

  const handleSaveNote = (noteToSave: Note) => {
    const existingIndex = notes.findIndex(note => note.id === noteToSave.id);
    if (existingIndex > -1) {
      const updatedNotes = [...notes];
      updatedNotes[existingIndex] = noteToSave;
      setNotes(updatedNotes.sort((a, b) => b.lastModified - a.lastModified));
    } else {
      setNotes([noteToSave, ...notes].sort((a, b) => b.lastModified - a.lastModified));
    }
    navigate('/');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[80vh] max-h-[700px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border-4 border-slate-200 dark:border-slate-700">
        <Routes>
          <Route path="/" element={<NoteList notes={notes} />} />
          <Route path="/note/:id" element={<NoteEditor notes={notes} onSave={handleSaveNote} onDelete={handleDeleteNote} />} />
        </Routes>
      </div>
      <InstallPWA />
    </div>
  );
}

export default App;