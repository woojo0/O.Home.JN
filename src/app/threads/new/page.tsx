'use client';
// 감상타래 — 새 타래 시작 (작품 등록, 4.17 페이지형)
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED } from '@/lib/charStore';
import { canWriteThreads } from '@/lib/threadStore';
import { useSectionParam, useSectionTitle } from '@/lib/sectionStore';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { ThreadForm } from '@/components/threads/ThreadForm';

function ThreadNewInner() {
  const { user, isAdmin } = useAuth();
  // 같이 쓰는 두 사람 (커플홈) — 관리자 + 캐릭터 권한을 받은 회원
  const [chars, , charsLoaded] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  // 큰 글씨 — 추가 섹션에서 들어왔으면(?s=) 그 이름, 눌렀을 때도 그 목록으로 (v2.0 사용자 제보)
  const sec = useSectionParam('threads');
  const tt = useSectionTitle('threads', sec.id, 'THREADS');
  if (!charsLoaded) return <section className="page" />;
  if (!canWriteThreads(chars, { isAdmin, id: user?.id })) {
    return (
      <section className="page">
        <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle><p>감상타래를 같이 쓰는 회원만 들어올 수 있습니다</p></div>
      </section>
    );
  }
  return (
    <section className="page">
      <div className="page-head">
        <PageTitle href={tt.href}>{tt.title}</PageTitle>
        <EditableDesc k="threads-new-desc" def="새 타래 시작 — 작품 정보를 등록하면 타래에 글을 이어 쓸 수 있습니다" />
      </div>
      <ThreadForm />
    </section>
  );
}

/** ?s= 를 읽으므로 Suspense 경계가 필요하다 (Next App Router) */
export default function ThreadNewPage() {
  return <Suspense fallback={<section className="page" />}><ThreadNewInner /></Suspense>;
}
