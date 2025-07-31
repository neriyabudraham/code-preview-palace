// Temporary mock for PostgreSQL connection
// Note: Direct PostgreSQL connection cannot run in browser
// This needs to be moved to a backend API

export async function connectToDb() {
  console.log('Mock: Connected to database');
}

export async function query(text: string, params?: any[]) {
  console.log('Mock query:', text, params);
  return { 
    rows: [] as any[] 
  };
}