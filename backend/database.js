import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL pool configuration
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'attendance_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;