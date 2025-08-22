// =====================================
// config/database.js
// =====================================
const knex = require('knex');

const USE_DATABASE = process.env.DB_TYPE && ['mysql', 'postgresql', 'mariadb'].includes(process.env.DB_TYPE);

let db = null;

if (USE_DATABASE) {
  const dbConfig = {
    client: process.env.DB_TYPE === 'postgresql' ? 'pg' : 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'notes_app',
      port: process.env.DB_PORT || (process.env.DB_TYPE === 'postgresql' ? 5432 : 3306)
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  };
  
  db = knex(dbConfig);
}

module.exports = { db, USE_DATABASE };
