
// =====================================
// utils/fileSystem.js
// =====================================
const fs = require('fs').promises;
const path = require('path');
const { NOTES_DIR, UPLOADS_DIR } = require('../config/constants');

async function ensureDirectories() {
  const directories = [NOTES_DIR, UPLOADS_DIR, path.dirname(require('../config/constants').USERS_FILE)];
  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

function generateId() {
  return require('crypto').randomBytes(8).toString('hex');
}

module.exports = { ensureDirectories, generateId };
