// src/environments/environment.interface.ts
export interface Environment {
  production: boolean;
  apiUrl: string;
  NEXT_PUBLIC_SUPABASE_URL:string,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:string,
}