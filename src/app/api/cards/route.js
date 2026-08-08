import { NextResponse } from 'next/server';
import Redis from 'ioredis';

const KV_KEY = 'cancelculture:trades';

// Initialize Redis if the URL is provided in the environment variables
let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

async function getTradesDb() {
  if (!redis) {
    console.warn('REDIS_URL is not defined. Using empty database in-memory.');
    return {};
  }
  
  try {
    const data = await redis.get(KV_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Redis Get Error:', error);
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

    if (redis) {
      await redis.set(KV_KEY, JSON.stringify(db));
    }

    return NextResponse.json({ success: true, data: db[playerTag] });
  } catch (error) {
    console.error('Error writing to trades DB:', error);
    return NextResponse.json({ error: 'Failed to save trades data.' }, { status: 500 });
  }
}
