import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rytycngpbxmqooltvdof.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dHljbmdwYnhtcW9vbHR2ZG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDc4NTYsImV4cCI6MjEwMDgyMzg1Nn0.TWuODzQUQNQHj779R055H1h5ka7gOQUqQ88V8TeUqj0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
