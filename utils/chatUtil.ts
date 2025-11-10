// utils/chatUtil.ts
import { ChatService, type ChatMessage, type ChatReaction, type ChatRoom } from '@/api/chat/chatService';
import { getWeekdayLabel } from '@/utils/commonUtil';
import dayjs from 'dayjs';

/** 코드/텍스트 세그먼트 타입 */
export type MsgSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; lang: string | null };

/** 멘션/HTML 제거 + <br> → 개행 */
export function stripHtmlMentions(html: string) {
  if (!html) return '';
  return html
    .replace(/<m [^>]*>(.*?)<\/m>/g, '$1')   // <m ...>멘션</m> → 멘션 텍스트
    .replace(/<br\s*\/?>/gi, '\n')           // <br> → \n
    .replace(/<[^>]+>/g, '');                // 나머지 태그 제거
}

/** ```lang\n ... \n``` 및 <pre>...</pre> 블록 모두 지원 */
export function parseFencedBlocks(input: string): MsgSegment[] {
  if (!input) return [{ type: 'text', content: '' }];

  const out: MsgSegment[] = [];
  let lastIndex = 0;

  // ✅ <pre>...</pre> 또는 ```lang\n...\n``` 모두 매칭
  const re = /(<pre[^>]*>[\s\S]*?<\/pre>)|(```(\w+)?\r?\n([\s\S]*?)\r?\n```)/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input))) {
    if (m.index > lastIndex) {
      // 코드블록 앞의 일반 텍스트
      out.push({ type: 'text', content: input.slice(lastIndex, m.index) });
    }

    // 1️⃣ ``` fenced code block
    if (m[2]) {
      const lang = m[3] ?? null;
      const code = m[4] ?? '';
      out.push({ type: 'code', lang, content: code });
    }
    // 2️⃣ <pre> ... </pre> block
    else if (m[1]) {
      const preBlock = m[1];
      // 언어 추출
      let lang: string | null = null;
      const dataLangMatch = preBlock.match(/data-lang=["']([^"']+)["']/i);
      if (dataLangMatch) lang = dataLangMatch[1];
      else {
        const classMatch = preBlock.match(/class=["']([^"']+)["']/i);
        if (classMatch) {
          const cls = classMatch[1];
          const m2 =
            cls.match(/language-([a-z0-9+#]+)/i) ??
            cls.match(/lang-([a-z0-9+#]+)/i);
          if (m2) lang = m2[1];
        }
      }

      const innerMatch = preBlock.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      const inner = innerMatch
        ? innerMatch[1]
        : preBlock.replace(/^<pre[^>]*>/i, '').replace(/<\/pre>$/i, '');

      out.push({ type: 'code', lang, content: inner });
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < input.length) {
    // 마지막 코드블록 뒤의 텍스트
    out.push({ type: 'text', content: input.slice(lastIndex) });
  }

  return out.length ? out : [{ type: 'text', content: input }];
}

/** 미리보기 세그먼트 구성 (텍스트는 글자 제한, 코드블록은 최대 N개 유지) */
export function buildPreviewSegments(
  raw: string,
  options?: { previewMaxChars?: number; maxCodeBlocks?: number }
): { segments: MsgSegment[]; truncated: boolean } {
  const previewMaxChars = options?.previewMaxChars ?? 240;
  const maxCodeBlocks = options?.maxCodeBlocks ?? 1;

  const all = parseFencedBlocks(raw);
  const hasFence = all.some((s) => s.type === 'code');

  // 펜스가 없으면 텍스트만 잘라서
  if (!hasFence) {
    const plain = stripHtmlMentions(raw);
    if (plain.length > previewMaxChars) {
      return { segments: [{ type: 'text', content: plain.slice(0, previewMaxChars) + '…' }], truncated: true };
    }
    return { segments: [{ type: 'text', content: plain }], truncated: false };
  }

  // 펜스가 섞이면 텍스트는 예산 내에서 자르고, 코드블록은 maxCodeBlocks까지만 유지
  const limited: MsgSegment[] = [];
  let codeCnt = 0;
  let textBudget = previewMaxChars;
  let truncated = false;

  for (const s of all) {
    if (s.type === 'code') {
      if (codeCnt < maxCodeBlocks) {
        limited.push(s);
        codeCnt++;
      } else {
        truncated = true;
        break;
      }
    } else {
      const text = s.content;
      if (text.length <= textBudget) {
        limited.push({ type: 'text', content: text });
        textBudget -= text.length;
      } else {
        limited.push({ type: 'text', content: text.slice(0, textBudget) + '…' });
        truncated = true;
        break;
      }
    }
  }

  return { segments: limited.length ? limited : [{ type: 'text', content: '' }], truncated };
}

/** 시간 표기 (오늘은 HH:mm, 과거는 YYYY-MM-DD(요일) HH:mm) */
export function formatChatTime(createDate: string, locale: 'ko' | 'en' = 'ko') {
  const date = dayjs(createDate);
  if (date.isSame(dayjs(), 'day')) return date.format('HH:mm');
  return date.format(`YYYY-MM-DD(${getWeekdayLabel(date, { locale, style: 'short' })}) HH:mm`);
}

/** 읽음/안읽음 메타 계산 */
export function getReadMeta(
  chatRoom: ChatRoom | null,
  msg: ChatMessage
): { show: boolean; count: number; readSeqs: number[]; unreadSeqs: number[] } {
  const read = msg.readMembers?.length ?? 0;
  if (read <= 0) return { show: false, count: 0, readSeqs: [], unreadSeqs: [] };
  const unreadSeqs = chatRoom?.joiningMemberSeqList.filter((s) => !msg.readMembers.includes(s)) ?? [];
  return { show: true, count: read, readSeqs: msg.readMembers, unreadSeqs };
}

/** 부모 메시지 스니펫 텍스트 생성 */
export function getParentPlainText(parent?: ChatMessage | null) {
  if (!parent) return '';
  switch (parent.chatType) {
    case 'M':
      return stripHtmlMentions(parent.content ?? '');
    case 'L':
      return parent.content ?? '';
    case 'F':
      return parent.fileName ?? parent.content ?? '';
    default:
      return stripHtmlMentions(parent.content ?? '');
  }
}

/** 리액션 집계(같은 이모지 그룹핑) + 내 리액션 우선 키 */
export function aggregateReactions(
  reactions: ChatReaction[] | undefined,
  myMemberSeq: number
): {
  list: Array<{ key: string; label: string; members: number[]; hasMe?: boolean; myPkList?: number[] }>;
  hasAny: boolean;
  defaultKey: string | null;
} {
  type Agg = { key: string; label: string; members: number[]; hasMe?: boolean; myPkList?: number[] };
  const map = new Map<string, Agg>();

  (reactions ?? []).forEach((r) => {
    const key = String(r.reaction); // 이모지를 그룹키로
    if (!map.has(key)) map.set(key, { key, label: key, members: [] });
    const b = map.get(key)!;
    b.members.push(r.memberSeq);
    if (r.memberSeq === myMemberSeq) {
      b.hasMe = true;
      (b.myPkList ??= []).push(r.chatReactionSeq);
    }
  });

  for (const b of map.values()) {
    b.members = Array.from(new Set(b.members)); // 중복 방지
  }

  const list = Array.from(map.values()).sort((a, b) => b.members.length - a.members.length);
  const myFirst = list.find((x) => x.hasMe)?.key ?? list[0]?.key ?? null;

  return { list, hasAny: list.length > 0, defaultKey: myFirst };
}

/** 메시지에 코드블록(``` 또는 <pre>)이 포함되어 있는지 */
export function hasCodeFence(raw: string) {
  if (!raw) return false;
  return /```/.test(raw) || /<pre[^>]*>[\s\S]*?<\/pre>/i.test(raw);
}

export function extractLinkFromMessage(raw: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = raw.match(urlRegex);
  return matches?.map(url => {
    return url.replace(/[', ";!?.)}\]>]+$/, '');
  })
}

export async function getLinkOpenGraph(url: string) {
  const data = await ChatService.getLinkOpenGraph(url);
  return data;
}