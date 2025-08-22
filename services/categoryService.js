// =====================================
// services/categoryService.js
// =====================================
const fs = require('fs').promises;
const { db, USE_DATABASE } = require('../config/database');
const { CATEGORIES_FILE } = require('../config/constants');
const { generateId } = require('../utils/fileSystem');

async function createCategory(categoryData) {
  const { name, color = '#3498db', description = '', userId } = categoryData;
  
  if (USE_DATABASE) {
    const [categoryId] = await db('categories').insert({
      name,
      color,
      description,
      user_id: userId
    });
    
    return await getCategoryById(categoryId);
  } else {
    const categories = await loadCategories();
    const id = generateId();
    const newCategory = {
      id,
      name,
      color,
      description,
      userId,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    categories.push(newCategory);
    await saveCategories(categories);
    return newCategory;
  }
}

async function getCategoryById(categoryId) {
  if (USE_DATABASE) {
    return await db('categories').where('id', categoryId).first();
  } else {
    const categories = await loadCategories();
    return categories.find(c => c.id === categoryId);
  }
}

async function getCategoriesByUser(userId) {
  if (USE_DATABASE) {
    return await db('categories')
      .where('user_id', userId)
      .orderBy('name', 'asc');
  } else {
    const categories = await loadCategories();
    return categories
      .filter(c => c.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

async function updateCategory(categoryId, userId, updates) {
  if (USE_DATABASE) {
    const result = await db('categories')
      .where({ id: categoryId, user_id: userId })
      .update({
        ...updates,
        updated_at: db.fn.now()
      });
    
    if (result === 0) {
      throw new Error('Category not found or access denied');
    }
    
    return await getCategoryById(categoryId);
  } else {
    const categories = await loadCategories();
    const categoryIndex = categories.findIndex(c => c.id === categoryId && c.userId === userId);
    
    if (categoryIndex === -1) {
      throw new Error('Category not found or access denied');
    }
    
    categories[categoryIndex] = {
      ...categories[categoryIndex],
      ...updates,
      updated: new Date().toISOString()
    };
    
    await saveCategories(categories);
    return categories[categoryIndex];
  }
}

async function deleteCategory(categoryId, userId) {
  if (USE_DATABASE) {
    // First, set any notes using this category to null
    await db('notes')
      .where('category_id', categoryId)
      .update({ category_id: null });
    
    const result = await db('categories')
      .where({ id: categoryId, user_id: userId })
      .del();
    
    return result > 0;
  } else {
    const categories = await loadCategories();
    const categoryIndex = categories.findIndex(c => c.id === categoryId && c.userId === userId);
    
    if (categoryIndex === -1) {
      throw new Error('Category not found or access denied');
    }
    
    categories.splice(categoryIndex, 1);
    await saveCategories(categories);
    
    // Update notes that used this category (set categoryId to null)
    // This would need to be implemented in noteService if using file storage
    
    return true;
  }
}

async function loadCategories() {
  try {
    const data = await fs.readFile(CATEGORIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    // Return empty array if file doesn't exist
    return [];
  }
}

async function saveCategories(categories) {
  await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

async function getCategoryStats(userId) {
  if (USE_DATABASE) {
    const stats = await db('categories')
      .select(
        'categories.id',
        'categories.name',
        'categories.color'
      )
      .count('notes.id as note_count')
      .leftJoin('notes', 'categories.id', 'notes.category_id')
      .where('categories.user_id', userId)
      .groupBy('categories.id', 'categories.name', 'categories.color')
      .orderBy('categories.name');
    
    return stats.map(stat => ({
      ...stat,
      note_count: parseInt(stat.note_count) || 0
    }));
  } else {
    const categories = await getCategoriesByUser(userId);
    const notes = require('./noteService').getNotesByUser ? 
      await require('./noteService').getNotesByUser(userId) : [];
    
    return categories.map(category => ({
      ...category,
      note_count: notes.filter(note => note.categoryId === category.id).length
    }));
  }
}

module.exports = {
  createCategory,
  getCategoryById,
  getCategoriesByUser,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  loadCategories,
  saveCategories
};