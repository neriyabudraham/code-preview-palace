// This file provides compatibility layer for PostgreSQL migration
import { query } from '@/lib/db';

// Mock supabase client for compatibility during migration
export const supabase = {
  from: (table: string) => ({
    select: async (columns: string = '*') => {
      try {
        const result = await query(`SELECT ${columns} FROM ${table}`);
        return { data: result.rows, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  }),
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signUp: async () => ({ data: null, error: null }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null })
  },
  functions: {
    invoke: async () => ({ data: null, error: null })
  }
};