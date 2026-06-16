import { createClient } from '@supabase/supabase-js';
import { environment } from './environments/environment';

export const supabase = createClient(
  environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);