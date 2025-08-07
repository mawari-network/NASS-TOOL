import mysql from 'mysql2/promise';
import { Wallet } from '@/types/wallet';

let pool: mysql.Pool;

export async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

export async function query(sql: string, values?: any[]) {
  const pool = await getPool();
  const [rows] = await pool.execute(sql, values);
  return rows;
}