import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다.');
  console.warn('다음 환경변수를 .env 파일에 추가하세요:');
  console.warn('VITE_SUPABASE_URL=your-supabase-url');
  console.warn('VITE_SUPABASE_ANON_KEY=your-supabase-anon-key');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
