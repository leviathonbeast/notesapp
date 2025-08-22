// =====================================
// config/constants.js
// =====================================
const path = require('path');
const crypto = require('crypto');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  NOTES_DIR: path.join(__dirname, '../data/notes'),
  USERS_FILE: path.join(__dirname, '../data/users.json'),
  CATEGORIES_FILE: path.join(__dirname, '../data/categories.json'),
  UPLOADS_DIR: path.join(__dirname, '../uploads'),
  MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
};
