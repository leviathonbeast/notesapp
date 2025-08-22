// =====================================
// routes/admin.js
// =====================================
const express = require('express');
const { 
  getUserById, 
  updateUser, 
  loadUsers, 
  saveUsers 
} = require('../services/userService');
const { 
  getNotesByUser 
} = require('../services/noteService');
const { 
  getCategoriesByUser 
} = require('../services/categoryService');
const { db, USE_DATABASE } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    let stats;
    
    if (USE_DATABASE) {
      const userCount = await db('users').count('id as count').first();
      const noteCount = await db('notes').count('id as count').first();
      const categoryCount = await db('categories').count('id as count').first();
      const activeUsers = await db('users').count('id as count').where('is_active', true).first();
      
      // Recent activity
      const recentNotes = await db('notes')
        .select('notes.title', 'notes.created_at', 'users.username')
        .join('users', 'notes.user_id', 'users.id')
        .orderBy('notes.created_at', 'desc')
        .limit(5);
      
      const recentUsers = await db('users')
        .select('username', 'email', 'created_at', 'last_login')
        .orderBy('created_at', 'desc')
        .limit(5);
      
      stats = {
        totalUsers: parseInt(userCount.count),
        totalNotes: parseInt(noteCount.count),
        totalCategories: parseInt(categoryCount.count),
        activeUsers: parseInt(activeUsers.count),
        recentNotes,
        recentUsers
      };
    } else {
      const users = await loadUsers();
      const activeUsers = users.filter(u => u.isActive);
      
      // Count notes and categories across all users
      let totalNotes = 0;
      let totalCategories = 0;
      const recentNotes = [];
      
      for (const user of users) {
        try {
          const userNotes = await getNotesByUser(user.id);
          const userCategories = await getCategoriesByUser(user.id);
          
          totalNotes += userNotes.length;
          totalCategories += userCategories.length;
          
          // Add recent notes with username
          userNotes.slice(0, 2).forEach(note => {
            recentNotes.push({
              title: note.title,
              created_at: note.created,
              username: user.username
            });
          });
        } catch (error) {
          // Continue if error reading user data
        }
      }
      
      // Sort recent notes by date and limit to 5
      recentNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      stats = {
        totalUsers: users.length,
        totalNotes,
        totalCategories,
        activeUsers: activeUsers.length,
        recentNotes: recentNotes.slice(0, 5),
        recentUsers: users.slice(0, 5).map(u => ({
          username: u.username,
          email: u.email,
          created_at: u.created,
          last_login: u.lastLogin
        }))
      };
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    let users;
    
    if (USE_DATABASE) {
      users = await db('users')
        .select('id', 'username', 'email', 'is_admin', 'is_active', 'created_at', 'last_login')
        .orderBy('created_at', 'desc');
    } else {
      const allUsers = await loadUsers();
      users = allUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        is_admin: u.isAdmin,
        is_active: u.isActive,
        created_at: u.created,
        last_login: u.lastLogin
      }));
    }
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Get user details with statistics
router.get('/users/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's notes and categories
    const notes = await getNotesByUser(user.id);
    const categories = await getCategoriesByUser(user.id);
    
    // Remove password from response
    const { password, ...userInfo } = user;
    
    const userStats = {
      ...userInfo,
      noteCount: notes.length,
      categoryCount: categories.length,
      favoriteNotes: notes.filter(n => n.isFavorite || n.is_favorite).length,
      pinnedNotes: notes.filter(n => n.isPinned || n.is_pinned).length,
      archivedNotes: notes.filter(n => n.isArchived || n.is_archived).length
    };
    
    res.json(userStats);
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to load user details' });
  }
});

// Update user status (activate/deactivate, admin privileges)
router.put('/users/:id', async (req, res) => {
  try {
    const { isActive, isAdmin } = req.body;
    const userId = req.params.id;
    
    // Prevent admin from deactivating themselves
    if (userId === req.user.userId && isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
    
    // Prevent admin from removing their own admin privileges if they're the only admin
    if (userId === req.user.userId && isAdmin === false) {
      let adminCount;
      if (USE_DATABASE) {
        const result = await db('users').count('id as count').where('is_admin', true).first();
        adminCount = parseInt(result.count);
      } else {
        const users = await loadUsers();
        adminCount = users.filter(u => u.isAdmin).length;
      }
      
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove admin privileges. At least one admin must exist.' });
      }
    }
    
    const updates = {};
    if (typeof isActive === 'boolean') {
      updates[USE_DATABASE ? 'is_active' : 'isActive'] = isActive;
    }
    if (typeof isAdmin === 'boolean') {
      updates[USE_DATABASE ? 'is_admin' : 'isAdmin'] = isAdmin;
    }
    
    const updatedUser = await updateUser(userId, updates);
    
    // Remove password from response
    const { password, ...userInfo } = updatedUser;
    res.json(userInfo);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (soft delete by deactivating)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    // Check if user exists and is not the last admin
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.isAdmin || user.is_admin) {
      let adminCount;
      if (USE_DATABASE) {
        const result = await db('users').count('id as count').where('is_admin', true).first();
        adminCount = parseInt(result.count);
      } else {
        const users = await loadUsers();
        adminCount = users.filter(u => u.isAdmin).length;
      }
      
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }
    
    // Soft delete by deactivating the user
    await updateUser(userId, { 
      [USE_DATABASE ? 'is_active' : 'isActive']: false 
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// System health check
router.get('/system/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      storage: USE_DATABASE ? 'database' : 'file-based',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: require('../package.json').version
    };
    
    // Test database connection if using database
    if (USE_DATABASE) {
      try {
        await db.raw('SELECT 1');
        health.database = 'connected';
      } catch (dbError) {
        health.database = 'disconnected';
        health.status = 'degraded';
      }
    }
    
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;