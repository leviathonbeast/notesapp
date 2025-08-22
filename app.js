
// =====================================
// app.js (Main Application File)
// =====================================
const express = require('express');
const path = require('path');
const { PORT } = require('./config/constants');
const { db, USE_DATABASE } = require('./config/database');
const { ensureDirectories } = require('./utils/fileSystem');
const { loadUsers } = require('./services/userService');

// Initialize database if using DB
async function initDatabase() {
  if (!db) return;
  
  try {
    // Users table
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').unique().notNullable();
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
        table.boolean('is_admin').defaultTo(false);
        table.boolean('is_active').defaultTo(true);
        table.string('avatar_url');
        table.text('bio');
        table.json('preferences').defaultTo('{}');
        table.timestamp('last_login');
        table.timestamps(true, true);
      });
    }

    // Categories table
    const hasCategoriesTable = await db.schema.hasTable('categories');
    if (!hasCategoriesTable) {
      await db.schema.createTable('categories', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('color').defaultTo('#3498db');
        table.text('description');
        table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.timestamps(true, true);
      });
    }

    // Notes table
    const hasNotesTable = await db.schema.hasTable('notes');
    if (!hasNotesTable) {
      await db.schema.createTable('notes', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.text('content');
        table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
        table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.boolean('is_pinned').defaultTo(false);
        table.boolean('is_favorite').defaultTo(false);
        table.boolean('is_archived').defaultTo(false);
        table.json('tags').defaultTo('[]');
        table.json('attachments').defaultTo('[]');
        table.integer('view_count').defaultTo(0);
        table.timestamps(true, true);
      });
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin', require('./routes/admin'));

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function start() {
  try {
    if (USE_DATABASE) {
      await initDatabase();
    } else {
      await ensureDirectories();
      await loadUsers(); // This will create default admin if needed
    }
    
    app.listen(PORT, () => {
      console.log(`Enhanced Notes App running on http://localhost:${PORT}`);
      console.log(`Storage: ${USE_DATABASE ? 'Database' : 'File-based'}`);
      console.log('Application started successfully!');
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

start();
