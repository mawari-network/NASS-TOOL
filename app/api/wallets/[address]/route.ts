import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const updates = await request.json();
    const { address } = params;

    // Validate updates
    if (!updates || (updates.label === undefined && updates.hasLicenses === undefined)) {
      return NextResponse.json(
        { error: 'No valid update parameters provided' },
        { status: 400 }
      );
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (updates.label !== undefined) {
      updateFields.push('label = ?');
      updateValues.push(updates.label);
    }

    if (updates.hasLicenses !== undefined) {
      updateFields.push('has_licenses = ?');
      updateValues.push(updates.hasLicenses);
    }

    // Add address as the last parameter
    updateValues.push(address);

    // Only proceed if we have fields to update
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update wallet
    await query(
      `UPDATE wallets SET ${updateFields.join(', ')} WHERE address = ?`,
      updateValues
    );

    // Get updated wallet
    const [wallet] = await query(
      'SELECT * FROM wallets WHERE address = ?',
      [address]
    ) as any[];

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(wallet);
  } catch (error) {
    console.error('Failed to update wallet:', error);
    return NextResponse.json(
      { error: 'Failed to update wallet' },
      { status: 500 }
    );
  }
}