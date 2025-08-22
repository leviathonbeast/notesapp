
// =====================================
// routes/notes.js
// =====================================
const express = require('express');
const { createNote, getNotesByUser, getNoteById, updateNote, deleteNote } = require('../services/noteService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, archived, favorites, tag } = req.query;
    const filters = {
      category,
      archived: archived === 'true',
      favorites: favorites === 'true',
      tag
    };
    
    const notes = await getNotesByUser(req.user.userId, filters);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read notes' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const noteData = { ...req.body, userId: req.user.userId };
    const note = await createNote(noteData);
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const note = await updateNote(req.params.id, req.user.userId, req.body);
    res.json(note);
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await deleteNote(req.params.id, req.user.userId);
    res.status(204).send();
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

router.put('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { isFavorite } = req.body;
    await updateNote(req.params.id, req.user.userId, { isFavorite });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.put('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { isArchived } = req.body;
    await updateNote(req.params.id, req.user.userId, { isArchived });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

module.exports = router;
