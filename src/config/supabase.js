import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trcdmxsfovtrjzlljoyo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyY2RteHNmb3Z0cmp6bGxqb3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTExMzYsImV4cCI6MjA4OTQyNzEzNn0.kjGAJNJcH_9Tn6GYBSzl29769DF6L0f-uGRe9o0s2vM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
