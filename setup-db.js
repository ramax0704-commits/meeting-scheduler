import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.');
  console.error('VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 .env.local에 설정하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('🔄 데이터베이스 스키마 설정 중...\n');

    // SQL 파일 읽기
    const sqlPath = path.join(process.cwd(), 'supabase_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // SQL 문장 분리
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📝 총 ${statements.length}개의 SQL 문을 실행합니다.\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const isComment = statement.startsWith('--');

      if (isComment) {
        console.log(`   ${statement}`);
        continue;
      }

      try {
        console.log(`⏳ [${i + 1}/${statements.length}] 실행 중...`);
        const { error } = await supabase.rpc('exec', { query: statement });

        if (error && error.code !== 'PGRST102') {
          console.warn(`   ⚠️  경고: ${error.message}`);
        } else {
          console.log(`   ✅ 완료`);
        }
      } catch (err) {
        console.error(`   ❌ 오류: ${err.message}`);
      }
    }

    // 다른 방법: Supabase 웹 인터페이스 안내
    console.log('\n\n📌 중요: SQL이 완전히 실행되지 않았을 수 있습니다.');
    console.log('다음 단계를 따라주세요:\n');
    console.log('1️⃣  Supabase 대시보드 열기: https://supabase.com/dashboard');
    console.log('2️⃣  프로젝트 선택 (gibjqoqdzsfwrkpgaiua)');
    console.log('3️⃣  왼쪽 메뉴에서 "SQL Editor" 클릭');
    console.log('4️⃣  "New query" 클릭');
    console.log('5️⃣  supabase_schema.sql 파일의 내용을 복사해서 붙여넣기');
    console.log('6️⃣  "Run" 버튼 클릭\n');

    // 직접 API 호출 시도
    await setupViaSqlEditor();
  } catch (error) {
    console.error('❌ 설정 실패:', error.message);
    console.log('\n💡 해결 방법:');
    console.log('Supabase 대시보드의 SQL Editor에서 supabase_schema.sql을 실행해주세요.');
    process.exit(1);
  }
}

async function setupViaSqlEditor() {
  console.log('\n✨ 대안: Supabase REST API를 통한 설정...\n');

  const sqlPath = path.join(process.cwd(), 'supabase_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // 테이블 수동 생성 테스트
  try {
    console.log('📊 테이블 생성 테스트 중...');

    // meetings 테이블 생성 테스트
    const { error: meetingsError } = await supabase
      .from('meetings')
      .select('count', { count: 'exact' })
      .limit(0);

    if (meetingsError && meetingsError.code === 'PGRST116') {
      console.log('   ⚠️  meetings 테이블이 없습니다. 웹 대시보드에서 SQL을 실행하세요.');
    } else if (!meetingsError) {
      console.log('   ✅ meetings 테이블 확인됨');
    }
  } catch (err) {
    console.log('   ℹ️  테이블 생성 상태를 확인할 수 없습니다.');
  }
}

console.log('═══════════════════════════════════════');
console.log('   회의 일정 조율 - 데이터베이스 설정');
console.log('═══════════════════════════════════════\n');

setupDatabase();
