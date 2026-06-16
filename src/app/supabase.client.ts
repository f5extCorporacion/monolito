import { createClient } from '@supabase/supabase-js';
import { environment } from './environments/environment';

// El SDK usa estas dos variables para armar automáticamente los headers apikey y Bearer
export const supabase = createClient(
  environment.supabaseUrl, 
  environment.supabaseKey
);
