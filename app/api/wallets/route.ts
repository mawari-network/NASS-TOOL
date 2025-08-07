import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Wallet } from '@/types/wallet';

export async function GET() {
  try {
    const wallets = await query(
      'SELECT * FROM wallets ORDER BY created_at DESC'
    ) as Wallet[];
    return NextResponse.json(wallets);
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const wallet = await request.json();
    
    // Validate wallet data
    if (!wallet.address || !wallet.label) {
      return NextResponse.json(
        { error: 'Address and label are required' },
        { status: 400 }
      );
    }

    // Check if wallet already exists
    const existing = await query(
      'SELECT * FROM wallets WHERE LOWER(address) = LOWER(?)',
      [wallet.address]
    ) as any[];

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Wallet already exists' },
        { status: 400 }
      );
    }

    // Insert new wallet
    await query(
      'INSERT INTO wallets (address, label, has_licenses) VALUES (?, ?, ?)',
      [wallet.address, wallet.label, wallet.hasLicenses || false]
    );

    // Get the inserted wallet
    const [newWallet] = await query(
      'SELECT * FROM wallets WHERE address = ?',
      [wallet.address]
    ) as Wallet[];

    return NextResponse.json(newWallet);
  } catch (error) {
    console.error('Failed to create wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    );
  }
}