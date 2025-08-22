
// =====================================
// services/userService.js
// =====================================
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const { db, USE_DATABASE } = require('../config/database');
const { USERS_FILE } = require('../config/constants');
const { generateId } = require('../utils/fileSystem');

async function createUser(userData) {
  const { username, email, password, isAdmin = false } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);

  if (USE_DATABASE) {
    const [userId] = await db('users').insert({
      username,
      email,
      password: hashedPassword,
      is_admin: isAdmin,
      preferences: JSON.stringify({ theme: 'system', markdown: true })
    });
    return { id: userId, username, email, isAdmin };
  } else {
    const users = await loadUsers();
    const userId = generateId();
    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      isAdmin,
      isActive: true,
      preferences: { theme: 'system', markdown: true },
      created: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
    return { id: userId, username, email, isAdmin };
  }
}

async function getUserById(userId) {
  if (USE_DATABASE) {
    return await db('users').where('id', userId).first();
  } else {
    const users = await loadUsers();
    return users.find(u => u.id === userId);
  }
}

async function getUserByEmail(email) {
  if (USE_DATABASE) {
    return await db('users').where('email', email).first();
  } else {
    const users = await loadUsers();
    return users.find(u => u.email === email);
  }
}

async function updateUser(userId, updates) {
  if (USE_DATABASE) {
    await db('users').where('id', userId).update(updates);
    return await getUserById(userId);
  } else {
    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    
    users[userIndex] = { ...users[userIndex], ...updates };
    await saveUsers(users);
    return users[userIndex];
  }
}

async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const defaultUsers = [{
      id: generateId(),
      username: 'admin',
      email: 'admin@localhost',
      password: adminPassword,
      isAdmin: true,
      isActive: true,
      created: new Date().toISOString()
    }];
    await saveUsers(defaultUsers);
    return defaultUsers;
  }
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  loadUsers,
  saveUsers
};