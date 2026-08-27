const path = require('path');
const fs = require('fs');
const url = require('url');
require('dotenv').config();

function parseMysqlUrl(connectionUrl) {
  const parsed = url.parse(connectionUrl);
  const auth = parsed.auth ? parsed.auth.split(':') : [];
  return {
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port ? parseInt(parsed.port, 10) : 3306,
    user: decodeURIComponent(auth[0] || 'root'),
    password: auth.length > 1 ? decodeURIComponent(auth.slice(1).join(':')) : '',
    database: parsed.pathname ? decodeURIComponent(parsed.pathname.replace(/^\//, '')) : 'wifi_mapping_db'
  };
}

const mysqlFromUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
const dbClient = (process.env.DB_CLIENT || '').toLowerCase();
const useMysql = dbClient === 'mysql' || !!mysqlFromUrl;

let knexConfig = {};

if (useMysql) {
  const connection = mysqlFromUrl
    ? parseMysqlUrl(mysqlFromUrl)
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'wifi_mapping_db'
      };

  // TiDB Cloud and other cloud MySQL providers require SSL
  const isCloud = connection.host && (
    connection.host.includes('tidbcloud.com') ||
    connection.host.includes('rds.amazonaws.com') ||
    connection.host.includes('azure.com') ||
    process.env.DB_SSL === 'true'
  );

  if (isCloud) {
    connection.ssl = { rejectUnauthorized: true };
  }

  knexConfig = {
    client: 'mysql2',
    connection,
    pool: { min: 2, max: 10 }
  };
} else {
  const dbDir = path.join(__dirname, '..', 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.resolve(dbDir, 'wifi_mapping.sqlite3');

  knexConfig = {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.pragma('foreign_keys = ON');
        cb();
      }
    }
  };
}

const db = require('knex')(knexConfig);

module.exports = db;
