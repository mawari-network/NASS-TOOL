import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get table structure
    const [tableInfo] = await query(
      'SHOW CREATE TABLE wallets'
    ) as any[];

    // Get all records
    const wallets = await query('SELECT * FROM wallets');

    // Get record count
    const [countResult] = await query(
      'SELECT COUNT(*) as count FROM wallets'
    ) as any[];

    return NextResponse.json({
      table: tableInfo,
      records: wallets,
      count: countResult.count,
      message: 'Database queried successfully'
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to query database' },
      { status: 500 }
    );
  }
}