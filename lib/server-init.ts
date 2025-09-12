import { initializeDatabase } from './db-init';

let isInitialized = false;

export async function ensureDatabaseInitialized() {
  if (isInitialized) {
    return;
  }

  try {
    await initializeDatabase();
    isInitialized = true;
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
