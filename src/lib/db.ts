import { Client } from 'pg';

export const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'StrongPassword123',
  database: 'html',
});

let isConnected = false;

export async function connectToDb() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

export async function query(text: string, params?: any[]) {
  await connectToDb();
  return client.query(text, params);
}