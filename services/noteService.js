

// =====================================
// services/noteService.js
// =====================================
const fs = require('fs').promises;
const path = require('path');
const { db, USE_DATABASE } = require('../config/database');
const { NOTES_DIR } = require('../config/constants');
const { generateId } = require('../utils/fileSystem');

async function createNote(noteData) {
  const { title, content, categoryId, userId, isPinned = false, tags = [], attachments = [] } = noteData;
  
  if (USE_DATABASE) {
    const [noteId] = await db('notes').insert({
      title: title || 'Untitled Note',
      content: content || '',
      category_id: categoryId || null,
      user_id: userId,
      is_pinned: isPinned,
      tags: JSON.stringify(tags),
      attachments: JSON.stringify(attachments)
    });
    
    return await getNoteById(noteId, userId);
  } else {
    const id = generateId();
    const note = {
      id,
      title: title || 'Untitled Note',
      content: content || '',
      categoryId: categoryId || null,
      userId,
      isPinned,
      isFavorite: false,
      isArchived: false,
      tags,
      attachments,
      viewCount: 0,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    const filePath = path.join(NOTES_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(note, null, 2));
    return note;
  }
}

async function getNoteById(noteId, userId) {
  if (USE_DATABASE) {
    return await db('notes')
      .select('notes.*', 'categories.name as category_name', 'categories.color as category_color')
      .leftJoin('categories', 'notes.category_id', 'categories.id')
      .where('notes.id', noteId)
      .where('notes.user_id', userId)
      .first();
  } else {
    const filePath = path.join(NOTES_DIR, `${noteId}.json`);
    const content = await fs.readFile(filePath, 'utf8');
    const note = JSON.parse(content);
    return note.userId === userId ? note : null;
  }
}

async function getNotesByUser(userId, filters = {}) {
  const { category, archived = false, favorites = false, tag } = filters;
  
  if (USE_DATABASE) {
    let query = db('notes')
      .select('notes.*', 'categories.name as category_name', 'categories.color as category_color')
      .leftJoin('categories', 'notes.category_id', 'categories.id')
      .where('notes.user_id', userId);
    
    if (category) query = query.where('notes.category_id', category);
    query = query.where('notes.is_archived', archived);
    if (favorites) query = query.where('notes.is_favorite', true);
    
    query = query.orderBy('notes.is_pinned', 'desc')
                 .orderBy('notes.updated_at', 'desc');
    
    const notes = await query;
    
    return tag ? 
      notes.filter(note => {
        const tags = JSON.parse(note.tags || '[]');
        return tags.includes(tag);
      }) : notes;
  } else {
    const files = await fs.readdir(NOTES_DIR);
    const notes = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(NOTES_DIR, file), 'utf8');
        const note = JSON.parse(content);
        
        if (note.userId === userId) {
          if (archived && !note.isArchived) continue;
          if (!archived && note.isArchived) continue;
          if (favorites && !note.isFavorite) continue;
          if (category && note.categoryId !== category) continue;
          if (tag && (!note.tags || !note.tags.includes(tag))) continue;
          
          notes.push(note);
        }
      }
    }
    
    return notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return b.isPinned ? 1 : -1;
      }
      return new Date(b.updated) - new Date(a.updated);
    });
  }
}

async function updateNote(noteId, userId, updates) {
  if (USE_DATABASE) {
    await db('notes')
      .where({ id: noteId, user_id: userId })
      .update({
        ...updates,
        tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
        attachments: updates.attachments ? JSON.stringify(updates.attachments) : undefined,
        updated_at: db.fn.now()
      });
    
    return await getNoteById(noteId, userId);
  } else {
    const filePath = path.join(NOTES_DIR, `${noteId}.json`);
    const existing = JSON.parse(await fs.readFile(filePath, 'utf8'));
    
    if (existing.userId !== userId) {
      throw new Error('Access denied');
    }
    
    const updated = {
      ...existing,
      ...updates,
      updated: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }
}

async function deleteNote(noteId, userId) {
  if (USE_DATABASE) {
    const result = await db('notes').where({ id: noteId, user_id: userId }).del();
    return result > 0;
  } else {
    const filePath = path.join(NOTES_DIR, `${noteId}.json`);
    const existing = JSON.parse(await fs.readFile(filePath, 'utf8'));
    
    if (existing.userId !== userId) {
      throw new Error('Access denied');
    }
    
    await fs.unlink(filePath);
    return true;
  }
}

module.exports = {
  createNote,
  getNoteById,
  getNotesByUser,
  updateNote,
  deleteNote
};
