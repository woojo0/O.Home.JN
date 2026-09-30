// 다이어리 (4.14) — 무드 일기 + 무드 리스트 (환경설정 관리)
// 커플홈: 두 사람이 같이 쓰는 일기 — 대표 자관의 왼쪽/오른쪽 캐릭터 칸 · 구분 탭(환경설정) · 댓글
import { useCallback, useEffect, useState } from 'react';
import type { Visibility } from './charStore';
import { getRawSetting, setSetting } from './settingStore';

/* ---------- 무드 (5.2 — 환경설정에서 이름/아이콘/색 관리) ---------- */
export interface Mood {
  id: string;
  name: string;
  icon: string;      // 이모지/특수문자 1~2자
  color: string;     // 아이콘 색 (배경은 자동 틴트)
}

/** 무드는 처음부터 비어 있다 (v2.0) — 예시 4종은 프로토타입 잔재라 환경설정에서 직접 만든다 */
export const MOOD_SEED: Mood[] = [];

/* ---------- 일기 ---------- */
export interface DiaryPost {
  /** 소속 섹션 (v2.0) — 여러 개로 만들었을 때. 없으면 기본 섹션 */
  secId?: string;
  id: string;
  title: string;
  date: string;              // YYYY-MM-DD
  moodId: string;
  body: string;              // MD
  imgIds: string[];          // 첨부 이미지 (IndexedDB)
  visibility: Visibility;
  /** 누구의 일기인지 (커플홈) — 이 캐릭터로 쓴 일기. 대표 자관의 왼쪽/오른쪽 칸으로 나뉘어 보인다 */
  charId?: string;
  /** 쓴 회원 (커플홈 — 두 사람이 같이 쓴다) — 서버 행 주인이라 수정·삭제는 본인·관리자 */
  authorId?: string;
  /** 구분 탭 (커플홈 — 환경설정 > 다이어리에서 관리) — 없으면 구분 없음 */
  catId?: string;
}

export const DIARY_SEED: DiaryPost[] = [];

/** 한 페이지에 보일 일기 수 (커플홈 사용자 요청 — 달별 나눔 대신 페이지로) */
export const DIARY_PER_PAGE = 5;

/* ---------- 구분 탭 (커플홈 사용자 요청 — 무드 말고도 일기를 나눠 보는 탭, 환경설정에서 관리) ---------- */
export interface DiaryCat { id: string; name: string }
export interface DiarySettings { cats: DiaryCat[] }
export const DEFAULT_DIARY_SETTINGS: DiarySettings = { cats: [] };

const SET_KEY = 'ohome.diaryset.v1';

export function useDiarySettings(): [DiarySettings, (patch: Partial<DiarySettings>) => void, boolean] {
  const [st, setSt] = useState<DiarySettings>(DEFAULT_DIARY_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = getRawSetting(SET_KEY);
      if (raw) setSt({ ...DEFAULT_DIARY_SETTINGS, ...JSON.parse(raw) });
    } catch { /* 기본값 */ }
    setLoaded(true);
  }, []);
  const patch = useCallback((p: Partial<DiarySettings>) => {
    setSt(s => {
      const n = { ...s, ...p };
      try { setSetting(SET_KEY, n); } catch { /* 무시 */ }
      return n;
    });
  }, []);
  return [st, patch, loaded];
}

/** hex(#rrggbb) → 옅은 틴트 배경 (아이콘 원 배경용) */
export const moodTint = (hex: string) => /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}26` : 'rgba(127,127,127,.15)';
