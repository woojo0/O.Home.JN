'use client';
// 일기 작성/수정 공용 폼 (4.14) — 제목 · 날짜 · 무드 · 내용(MD) · 이미지 · 공개범위
// 커플홈: 누구의 일기(캐릭터) · 구분 탭
import React, { useEffect, useState } from 'react';
import { DiaryPost, Mood, moodTint, DiaryCat } from '@/lib/diaryStore';
import { Visibility, Character } from '@/lib/charStore';
import { newId } from '@/lib/postStore';
import { KInput, KTextarea, KSelect, KDate } from '@/components/ui/Kit';
import { DragList } from '@/components/ui/DragList';
import { useConfirmDelete } from '@/components/ui/Modal';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

export interface DiaryFormValue {
  title: string; date: string; moodId: string; body: string;
  imgIds: string[]; visibility: Visibility;
  charId?: string;   // 누구의 일기 (커플홈) — 이 캐릭터 이름으로, 자관의 그 캐릭터 칸에 보인다
  catId?: string;    // 구분 탭 (커플홈)
}

interface ImgItem { id: string; ref?: string; url?: string; file?: File }

function ImgThumb({ item }: { item: ImgItem }) {
  const loaded = useBlobUrl(item.ref);
  const src = item.url ?? loaded;
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6 }} /> : null;
}

export function DiaryForm({ initial, moods, cats, charChoices, initialCharId, initialCatId, lockChar, onSave, onCancel }: {
  initial: DiaryPost | null;
  moods: Mood[];
  cats: DiaryCat[];
  /** 이 사람이 일기를 쓸 수 있는 캐릭터 (관리자는 자캐, 상대 오너는 권한 받은 캐릭터) */
  charChoices: Character[];
  /** 새 일기에서 먼저 골라 둘 캐릭터 — 칸 머리의 ＋ WRITE로 들어오면 그 칸 캐릭터 */
  initialCharId?: string;
  /** 새 일기에서 먼저 골라 둘 구분 — 보고 있던 구분 탭 */
  initialCatId?: string;
  /** 관리자가 남의 일기를 고칠 때 — 누구의 일기인지는 바꾸지 않는다 */
  lockChar?: boolean;
  onSave: (v: DiaryFormValue) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const isNew = !initial;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? todayStr);
  const [moodId, setMoodId] = useState(initial?.moodId ?? moods[0]?.id ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [imgs, setImgs] = useState<ImgItem[]>(() => (initial?.imgIds ?? []).map(r => ({ id: newId(), ref: r })));
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'public');
  const [charId, setCharId] = useState<string>(
    initial?.charId ?? (initialCharId && charChoices.some(c => c.id === initialCharId) ? initialCharId : charChoices[0]?.id ?? ''));
  const [catId, setCatId] = useState<string>(
    initial?.catId ?? (initialCatId && cats.some(c => c.id === initialCatId) ? initialCatId : ''));
  // 구분 목록은 한 박자 늦게 읽힐 수 있다 — 새 일기면 도착했을 때 보고 있던 구분을 골라 둔다
  useEffect(() => {
    if (isNew && !catId && initialCatId && cats.some(c => c.id === initialCatId)) setCatId(initialCatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats]);
  const del = useConfirmDelete();   // 이미지 제거도 경고를 거친다

  const save = async () => {
    if (!title.trim()) { toast('제목을 입력해 주세요'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('날짜를 YYYY-MM-DD 형식으로 입력해 주세요'); return; }
    const imgIds = await Promise.all(imgs.map(i => (i.file ? putBlob(i.file) : Promise.resolve(i.ref!))));
    onSave({
      title: title.trim(), date, moodId, body, imgIds, visibility,
      charId: lockChar ? initial?.charId : (charId || undefined),
      catId: catId || undefined,
    });
  };

  return (
    <div className="write-grid">
      <div className="panel" style={{ padding: 24, display: 'grid', gap: 12, alignContent: 'start' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <KInput placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1 }} />
          <KDate value={date} onChange={setDate} style={{ maxWidth: 130 }} />
        </div>
        {/* 누구의 일기 · 구분 (커플홈) — 캐릭터를 고르면 그 이름으로, 자관의 그 캐릭터 칸에 보인다 */}
        {(charChoices.length > 0 && !lockChar) || cats.length > 0 ? (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {charChoices.length > 0 && !lockChar && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="cp-lb">누구의 일기</span>
                <KSelect minWidth={140} maxWidth={200} value={charId} onChange={setCharId}
                  options={charChoices.map(c => ({
                    value: c.id,
                    label: <span className="dot-lbl"><i className="cmt-dot" style={{ background: c.color }} />{c.name}</span>,
                  }))} />
              </div>
            )}
            {cats.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="cp-lb">구분</span>
                <KSelect minWidth={120} value={catId} onChange={setCatId}
                  options={[{ value: '', label: '구분 없음' }, ...cats.map(c => ({ value: c.id, label: c.name }))]} />
              </div>
            )}
          </div>
        ) : null}
        <div>
          <label className="k-label" style={{ marginBottom: 6 }}>무드</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {moods.map(m => (
              <button key={m.id}
                className="mood-pick"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999,
                  border: `1.5px solid ${moodId === m.id ? m.color : 'var(--line)'}`,
                  background: moodId === m.id ? moodTint(m.color) : 'transparent',
                  fontSize: 12, transition: '.15s',
                }}
                onClick={() => setMoodId(m.id)}>
                <span style={{ color: m.color }}>{m.icon}</span> {m.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="k-label" style={{ marginBottom: 6 }}>내용 — 마크다운 지원</label>
          <KTextarea value={body} onChange={e => setBody(e.target.value)} style={{ minHeight: 180 }} />
        </div>
        <label className="k-label" style={{ margin: 0 }}>이미지 (선택) — 본문 아래에 순서대로 표시 · ⠿ 순서</label>
        {imgs.length > 0 && (
          <DragList items={imgs} keyOf={i => i.id} onReorder={setImgs}
            render={i => (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', padding: '3px 0' }}>
                <span className="drag-h">⠿</span>
                <ImgThumb item={i} />
                <span className="fx" style={{ marginLeft: 'auto' }}
                  onClick={() => del.ask('이 이미지를 빼시겠습니까?',
                    () => setImgs(l => l.filter(x => x.id !== i.id)))}>✕</span>
              </div>
            )} />
        )}
        <input id="dyImgF" type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => {
            const list = e.target.files;
            if (list) setImgs(prev => [...prev, ...Array.from(list).map(f => ({ id: newId(), url: URL.createObjectURL(f), file: f }))]);
            e.target.value = '';
          }} />
        <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11, justifySelf: 'center' }}
          onClick={() => document.getElementById('dyImgF')?.click()}>＋ ADD IMAGE</button>
      </div>

      <div>
        <div className="panel widget" style={{ marginBottom: 14 }}>
          <h4>공개범위</h4>
          <KSelect value={visibility} onChange={v => setVisibility(v as Visibility)}
            options={[
              { value: 'public', label: '전체공개' },
              { value: 'member', label: '멤버공개' },
              { value: 'private', label: '나만보기' },
            ]} />
          <p className="hint" style={{ marginTop: 8 }}>비공개 일기는 메인 「최근 일기」 위젯에 절대 노출되지 않습니다</p>
        </div>
        <div className="form-actions">
          <button className="btn btn-onbk" onClick={onCancel}>CANCEL</button>
          <button className="btn btn-accent" onClick={save}>
            {isNew ? 'POST' : 'SAVE'}
          </button>
        </div>
      </div>
      {del.element}
    </div>
  );
}
