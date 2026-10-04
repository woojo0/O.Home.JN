'use client';
// 자관(홈) 리스트 (v2.1) — 총관리자가 로그인하면 보는 첫 화면.
// 홈을 만들고(이름 + 가입코드), 들어가고, 코드를 바꾸고, 지운다.
// 홈 안의 환경설정(테마·메뉴·권한)은 들어가서 바꾼다 — 여기서는 홈 자체만 다룬다.
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';
import type { HomeRow } from '@/lib/backend/types';
import { enterHome, randomInviteCode } from '@/lib/home';
import { newId } from '@/lib/postStore';
import { KInput } from '@/components/ui/Kit';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export function HomeList() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const del = useConfirmDelete();
  const [homes, setHomes] = useState<HomeRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  // 한 줄 편집 — 이름·가입코드
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eCode, setECode] = useState('');

  const load = async () => {
    const be = backend();
    if (!be) return;
    try {
      const [hs, ms] = await Promise.all([be.listHomes(), be.listMembers().catch(() => [])]);
      setHomes(hs);
      const c: Record<string, number> = {};
      ms.forEach(m => { if (m.homeId) c[m.homeId] = (c[m.homeId] ?? 0) + 1; });
      setCounts(c);
    } catch (e) {
      toast(`자관 목록을 받지 못했습니다 — ${(e as { message?: string })?.message ?? ''}`);
      setHomes([]);
    }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    const name = newName.trim();
    if (!name) { toast('자관 이름을 입력해 주세요'); return; }
    const be = backend();
    if (!be) return;
    setBusy(true);
    try {
      await be.createHome({ id: newId(), name, inviteCode: randomInviteCode(), createdAt: Date.now() });
      setNewName('');
      await load();
      toast('자관을 만들었습니다 — 가입코드를 회원에게 알려 주세요');
    } catch (e) {
      toast(`만들지 못했습니다 — ${(e as { message?: string })?.message ?? ''}`);
    }
    setBusy(false);
  };

  const startEdit = (h: HomeRow) => { setEditId(h.id); setEName(h.name); setECode(h.inviteCode); };
  const saveEdit = async () => {
    const be = backend();
    if (!be || !editId) return;
    const name = eName.trim(); const code = eCode.trim();
    if (!name || !code) { toast('이름과 가입코드를 모두 입력해 주세요'); return; }
    setBusy(true);
    try {
      await be.updateHome(editId, { name, inviteCode: code });
      setEditId(null);
      await load();
      toast('저장했습니다');
    } catch (e) {
      toast(`저장하지 못했습니다 — ${(e as { message?: string })?.message ?? ''}`);
    }
    setBusy(false);
  };

  const remove = (h: HomeRow) => {
    del.ask(`「${h.name}」 자관 삭제`, async () => {
      const be = backend();
      if (!be) return;
      setBusy(true);
      try {
        await be.deleteHome(h.id);
        await load();
        toast('자관을 지웠습니다');
      } catch (e) {
        toast(`지우지 못했습니다 — ${(e as { message?: string })?.message ?? ''}`);
      }
      setBusy(false);
    }, <>이 자관의 글·그림·설정이 모두 지워집니다. 회원 계정은 남지만 들어갈 자관이 없어집니다.<br />되돌릴 수 없습니다.</>);
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast('가입코드를 복사했습니다'); }
    catch { toast(`가입코드: ${code}`); }
  };

  return (
    <div className="setup-wrap">
      <div className="panel setup-box wide" style={{ margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--serif-base)', fontSize: 22, letterSpacing: '.25em', margin: 0, color: 'var(--ink)' }}>자관 리스트</h1>
          <span style={{ fontSize: 12, color: 'var(--faint)' }}>
            {user?.nickname} · 총관리자
            <button className="btn btn-ghost" style={{ marginLeft: 10, padding: '3px 10px', fontSize: 11 }} onClick={() => logout()}>로그아웃</button>
          </span>
        </div>
        <p className="d" style={{ margin: '6px 0 18px' }}>
          자관 하나가 홈 하나입니다. 들어가서 꾸미고, 가입코드를 회원에게 알려 주면 그 회원은 로그인할 때 바로 그 자관으로 갑니다.
        </p>

        {homes === null && <p className="hint">불러오는 중…</p>}
        {homes && homes.length === 0 && (
          <p className="hint" style={{ margin: '0 0 14px' }}>아직 자관이 없습니다 — 아래에서 첫 자관을 만들어 보세요.</p>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {homes?.map(h => (
            <div key={h.id} className="panel" style={{ padding: '14px 16px', boxShadow: 'none', border: '1px solid var(--line)' }}>
              {editId === h.id ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <label className="k-label">이름</label>
                  <KInput value={eName} onChange={e => setEName(e.target.value)} />
                  <label className="k-label">가입코드</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <KInput value={eCode} onChange={e => setECode(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setECode(randomInviteCode())}>새로 만들기</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setEditId(null)}>CANCEL</button>
                    <button className="btn btn-dark" disabled={busy} onClick={saveEdit}>SAVE</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <b style={{ fontSize: 15, color: 'var(--ink)' }}>{h.name}</b>
                    <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>가입코드 <code style={{ fontSize: 12, color: 'var(--ink)', letterSpacing: '.08em' }}>{h.inviteCode || '—'}</code>
                        <button className="btn btn-ghost" style={{ marginLeft: 6, padding: '1px 7px', fontSize: 10 }} onClick={() => copy(h.inviteCode)}>복사</button>
                      </span>
                      <span>회원 {counts[h.id] ?? 0}명</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => startEdit(h)}>수정</button>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={busy} onClick={() => remove(h)}>삭제</button>
                    <button className="btn btn-dark" onClick={() => enterHome(h.id)}>들어가기 →</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="setup-sep" />
        <label className="k-label">새 자관 만들기</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <KInput placeholder="자관 이름" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1 }}
            onKeyDown={e => { if (e.key === 'Enter') create(); }} />
          <button className="btn btn-accent" disabled={busy} onClick={create}>＋ 만들기</button>
        </div>
        <p className="hint">가입코드는 자동으로 만들어집니다 — 만든 뒤 「수정」에서 바꿀 수 있습니다.</p>
      </div>
      {del.element}
    </div>
  );
}
