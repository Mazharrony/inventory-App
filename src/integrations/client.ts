// Database client using local storage
import { MockSupabaseClient } from '@/lib/mockSupabase';
import type { Database } from './types';

// Use local storage-based client
const supabaseInstance = new MockSupabaseClient();

// Import the supabase client like this:
// import { supabase } from "@/integrations/client";

export const supabase = supabaseInstance;