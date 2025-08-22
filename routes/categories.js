// =====================================
// routes/categories.js
// =====================================
const express = require('express');
const { 
  createCategory, 
  getCategoriesByUser, 
  getCategoryById,
  updateCategory, 
  deleteCategory, 
  getCategoryStats 
} = require('../services/categoryService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all categories for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await getCategoriesByUser(req.user.userId);
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// Get category statistics (with note counts)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getCategoryStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ error: 'Failed to load category statistics' });
  }
});

// Get a specific category
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const category = await getCategoryById(req.params.id);
    
    if (!category || category.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to load category' });
  }
});

// Create a new category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, color, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    if (name.trim().length > 50) {
      return res.status(400).json({ error: 'Category name must be 50 characters or less' });
    }
    
    // Validate color format (hex color)
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Invalid color format. Use hex format like #3498db' });
    }
    
    const categoryData = {
      name: name.trim(),
      color: color || '#3498db',
      description: description ? description.trim() : '',
      userId: req.user.userId
    };
    
    const category = await createCategory(categoryData);
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, color, description } = req.body;
    const updates = {};
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Category name cannot be empty' });
      }
      if (name.trim().length > 50) {
        return res.status(400).json({ error: 'Category name must be 50 characters or less' });
      }
      updates.name = name.trim();
    }
    
    if (color !== undefined) {
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return res.status(400).json({ error: 'Invalid color format. Use hex format like #3498db' });
      }
      updates.color = color;
    }
    
    if (description !== undefined) {
      updates.description = description.trim();
    }
    
    const category = await updateCategory(req.params.id, req.user.userId, updates);
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    if (error.message === 'Category not found or access denied') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const success = await deleteCategory(req.params.id, req.user.userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete category error:', error);
    if (error.message === 'Category not found or access denied') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;