import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'trades.json');

async function getTradesDb() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(dbPath, '{}');
      return {};
    }
    throw error;
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

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, data: db[playerTag] });
  } catch (error) {
    console.error('Error writing to trades DB:', error);
    return NextResponse.json({ error: 'Failed to save trades data' }, { status: 500 });
  }
}
