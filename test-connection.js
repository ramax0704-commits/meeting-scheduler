import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// .env.local 파일 로드
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('═══════════════════════════════════════');
console.log('   Supabase 연결 테스트');
console.log('═══════════════════════════════════════\n');

// 환경변수 확인
console.log('📋 환경변수 확인:');
if (supabaseUrl) {
  console.log(`✅ VITE_SUPABASE_URL: ${supabaseUrl}`);
} else {
  console.log('❌ VITE_SUPABASE_URL: 설정되지 않음');
}

if (supabaseKey) {
  const keyPreview = supabaseKey.substring(0, 20) + '...';
  console.log(`✅ VITE_SUPABASE_ANON_KEY: ${keyPreview}`);
} else {
  console.log('❌ VITE_SUPABASE_ANON_KEY: 설정되지 않음');
}

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ 환경변수가 설정되지 않았습니다!');
  console.log('💡 .env.local 파일을 확인해주세요.\n');
  process.exit(1);
}

console.log('\n🔄 Supabase 연결 중...\n');

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // 간단한 쿼리로 연결 테스트
    const { data, error } = await supabase
      .from('meetings')
      .select('count', { count: 'exact' })
      .limit(0);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  meetings 테이블이 없습니다.');
        console.log('💡 다음을 해주세요:');
        console.log('   1. SQL_SETUP.md 파일 읽기');
        console.log('   2. Supabase 웹 대시보드에서 SQL 실행\n');
        console.log('📝 SQL 파일: supabase_schema.sql\n');
        return false;
      } else {
        console.log('❌ Supabase 오류:', error.message);
        return false;
      }
    }

    console.log('✅ Supabase 연결 성공!\n');
    console.log('📊 테이블 확인:');

    // 각 테이블 존재 여부 확인
    const tables = ['meetings', 'time_slots', 'participant_responses'];
    let allTablesExist = true;

    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count', { count: 'exact' })
        .limit(0);

      if (tableError && tableError.code === 'PGRST116') {
        console.log(`   ❌ ${table}: 없음`);
        allTablesExist = false;
      } else if (tableError) {
        console.log(`   ❓ ${table}: 확인 불가 (${tableError.message})`);
      } else {
        console.log(`   ✅ ${table}: 있음`);
      }
    }

    if (!allTablesExist) {
      console.log('\n⚠️  일부 테이블이 없습니다.');
      console.log('💡 SQL_SETUP.md를 참고하여 테이블을 생성해주세요.\n');
      return false;
    }

    console.log('\n🎉 모든 테이블이 준비되었습니다!\n');
    console.log('다음 명령어로 웹앱을 시작하세요:');
    console.log('   npm run dev\n');
    return true;
  } catch (err) {
    console.log('❌ 연결 오류:', err.message);
    console.log('\n💡 확인 사항:');
    console.log('   - .env.local 파일이 올바른지 확인');
    console.log('   - Supabase URL과 API 키가 정확한지 확인');
    console.log('   - 인터넷 연결 확인\n');
    return false;
  }
}

testConnection().then((success) => {
  if (!success) {
    process.exit(1);
  }
});
