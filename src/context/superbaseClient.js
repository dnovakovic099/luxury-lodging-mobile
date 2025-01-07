import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://pjntjmrzwofdbpvsbped.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbnRqbXJ6d29mZGJwdnNicGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3NzQ1OTksImV4cCI6MjA0ODM1MDU5OX0.6TFcffCmwGGiFlEdlmgDxoG6GvJUiwLZj36scmbhB_I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});