// 역극 로그 만들기 (커플홈) — 역극 방의 발화를 txt / html 로그로.
// txt는 파일 저장용, html은 파일 저장 + RP LOG 게시판 본문용(상세에서 원본 스타일 그대로 그려진다).
import type { RpMessage } from './rpStore';
import { hexRgb } from './rpStore';
import type { Character } from './charStore';

export interface RpLogInfo {
  title: string;
  sub?: string;           // 방 소제목 — 페어면 캐릭터 이름 둘, 다인관이면 자관명
}

export interface RpLogOpts {
  /** 시각 표시 — 켜면 줄 앞에 [HH:MM], 날짜가 바뀌는 곳에 구분선 */
  time: boolean;
  /** RP LOG 게시판 본문용 — 제목·캐릭터 이름은 게시판 상세가 이미 위에 보여 주므로 빼고 기간·개수만 */
  forBoard?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};
const hm = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 첫 발화 ~ 마지막 발화 날짜 (같은 날이면 하나만) */
export function rpLogRange(msgs: RpMessage[]): string {
  if (!msgs.length) return '';
  const a = ymd(msgs[0].date);
  const b = ymd(msgs[msgs.length - 1].date);
  return a === b ? a : `${a} – ${b}`;
}

/** 마지막 발화 날짜 — RP LOG의 날짜 칸(YYYY-MM-DD) */
export function rpLogLastDate(msgs: RpMessage[]): string {
  const iso = msgs.length ? msgs[msgs.length - 1].date : new Date().toISOString();
  return ymd(iso).replace(/\./g, '-');
}

/** 이 로그에서 말한 캐릭터 — 처음 말한 순서대로 (RP LOG의 「동행」 칸·썸네일 색) */
export function rpSpeakers(msgs: RpMessage[], chars: Character[]): Character[] {
  const seen = new Set<string>();
  const out: Character[] = [];
  for (const m of msgs) {
    if (m.kind !== 'char' || !m.charId || seen.has(m.charId)) continue;
    seen.add(m.charId);
    const c = chars.find(x => x.id === m.charId);
    if (c) out.push(c);
  }
  return out;
}

const nameOf = (chars: Character[], id?: string) =>
  chars.find(c => c.id === id)?.name || '(삭제된 캐릭터)';

/** 텍스트 로그 — 발화마다 빈 줄로 나눈다. 캐릭터 발화는 「이름: 대사」, 지문은 그대로 */
export function rpLogText(info: RpLogInfo, msgs: RpMessage[], chars: Character[], opts: RpLogOpts): string {
  const head = [
    ...(opts.forBoard ? [] : [info.title, ...(info.sub ? [info.sub] : [])]),
    [rpLogRange(msgs), `대화 ${msgs.length}개`].filter(Boolean).join(' · '),
    '─'.repeat(28),
  ];
  const body: string[] = [];
  let day = '';
  for (const m of msgs) {
    if (opts.time) {
      const d = ymd(m.date);
      if (d !== day) { day = d; body.push(`── ${d} ──`); }
    }
    const t = opts.time ? `[${hm(m.date)}] ` : '';
    const txt = m.text || (m.imgId ? '[사진]' : '');   // 사진만 보낸 문자 (커플홈 메신저 방)
    body.push(m.kind === 'char' ? `${t}${nameOf(chars, m.charId)}: ${txt}` : `${t}${txt}`);
  }
  return [...head, '', body.join('\n\n'), ''].join('\n');
}

const esc = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** 스타일 속성에 넣어도 되는 색만 — 저장된 값이 이상하면 기본색 */
const safeHex = (c?: string) => (c && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c) ? c : '#5d636d');

/** HTML 로그 — 한 장짜리 문서. 캐릭터 발화는 테마색 줄무늬 카드, 지문은 가운데 서술 */
export function rpLogHtml(info: RpLogInfo, msgs: RpMessage[], chars: Character[], opts: RpLogOpts): string {
  const rows: string[] = [];
  let day = '';
  for (const m of msgs) {
    if (opts.time) {
      const d = ymd(m.date);
      if (d !== day) { day = d; rows.push(`<div class="day">${d}</div>`); }
    }
    const t = opts.time ? `<span class="t">${hm(m.date)}</span>` : '';
    if (m.kind === 'char') {
      const c = chars.find(x => x.id === m.charId);
      const hex = safeHex(c?.color);
      rows.push(`<div class="m" style="--c:${hex};--rgb:${hexRgb(hex)}"><div class="who">${esc(nameOf(chars, m.charId))}${t}</div><div class="txt">${esc(m.text || (m.imgId ? '[사진]' : ''))}</div></div>`);
    } else {
      rows.push(`<div class="d">${t}${esc(m.text || (m.imgId ? '[사진]' : ''))}</div>`);
    }
  }
  const meta = [rpLogRange(msgs), `대화 ${msgs.length}개`].filter(Boolean).join(' · ');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(info.title)}</title>
<style>
body{margin:0;background:#f7f7f5;color:#2a2d33;font-family:'Pretendard','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif;font-size:14px}
.log{max-width:720px;margin:0 auto;padding:34px 20px 44px}
.hd{text-align:center;margin-bottom:26px;padding-bottom:18px;border-bottom:1px solid #e3e3df}
.hd h1{font-size:21px;letter-spacing:.06em;margin:0 0 6px;font-weight:700}
.hd .sub{font-size:12.5px;color:#666b74;letter-spacing:.08em}
.hd .meta{font-size:11px;color:#9a9ea6;margin-top:5px;letter-spacing:.04em}
.day{text-align:center;font-size:11px;color:#9a9ea6;letter-spacing:.16em;margin:26px 0 10px}
.m{margin:10px 0;padding:9px 14px 10px;border-left:3px solid var(--c);background:rgba(var(--rgb),.08);border-radius:0 10px 10px 0}
.m .who{font-size:12px;font-weight:700;color:var(--c);letter-spacing:.05em;margin-bottom:3px}
.m .txt{white-space:pre-wrap;word-break:break-word;line-height:1.75}
.d{margin:18px 6%;text-align:center;color:#50555e;line-height:1.85;white-space:pre-wrap;word-break:break-word}
.t{font-size:10px;font-weight:400;color:#a3a7ae;margin-left:8px;letter-spacing:.02em}
.d .t{display:block;margin:0 0 2px}
</style>
</head>
<body>
<div class="log">
<div class="hd">${opts.forBoard ? '' : `<h1>${esc(info.title)}</h1>${info.sub ? `<div class="sub">${esc(info.sub)}</div>` : ''}`}${meta ? `<div class="meta">${esc(meta)}</div>` : ''}</div>
${rows.join('\n')}
</div>
</body>
</html>
`;
}

/** 파일 이름으로 못 쓰는 문자를 걷어 낸다 (윈도 금지 문자 포함) */
export const logFileName = (title: string, ext: 'txt' | 'html') =>
  `${(title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim() || 'roleplay-log').slice(0, 80)}.${ext}`;

/** 브라우저에서 바로 내려받기 */
export function downloadText(name: string, text: string, mime: string): void {
  const u = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = u; a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
