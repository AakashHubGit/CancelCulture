import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// The key used in Vercel KV to store the trades object
const KV_KEY = 'cancelculture:trades';

async function getTradesDb() {
  try {
    const data = await kv.get(KV_KEY);
    return data || {};
  } catch (error) {
    console.error('KV Get Error:', error);
    // If KV is not configured, fall back to empty object
    return {};
  }
}

export async function GET() {
  try {
    const db = await getTradesDb();
    return NextResponse.json(db);
  } catch (error) {
    console.error('Error reading trades DB:', error);
    return NextResponse.json({ error: 'Failed to load trades data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { playerTag, playerName, needs, duplicates } = await request.json();

    if (!playerTag || !playerName) {
      return NextResponse.json({ error: 'Missing playerTag or playerName' }, { status: 400 });
    }

    const db = await getTradesDb();
    
    db[playerTag] = {
      name: playerName,
      needs: needs || [],
      duplicates: duplicates || [],
      lastUpdated: new Date().toISOString(),
    };

    await kv.set(KV_KEY, db);

    return NextResponse.json({ success: true, data: db[playerTag] });
  } catch (error) {
    console.error('Error writing to trades DB:', error);
    return NextResponse.json({ error: 'Failed to save trades data. Ensure Vercel KV is connected.' }, { status: 500 });
  }
}
