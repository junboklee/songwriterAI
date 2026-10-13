// Song brief wizard: turns a few choices into a clear first request for the chat model.

export const BRIEF_GENRES = ['발라드', '댄스·팝', '힙합', 'R&B', '록·밴드', '어쿠스틱·포크', '시티팝', '트로트', '로파이'];
export const BRIEF_MOODS = ['설렘', '그리움', '위로', '신남', '쓸쓸함', '희망', '이별', '사랑 고백'];
export const BRIEF_TEMPOS = ['느리게', '보통', '빠르게'] as const;
export const BRIEF_LENGTHS = {
  short: '1절과 후렴만 짧게',
  full: '1절, 2절, 후렴, 브릿지까지 한 곡 전체'
} as const;
export const BRIEF_LANGUAGES = {
  ko: '한국어',
  mixed: '한국어에 영어 표현을 조금 섞어서',
  en: '영어'
} as const;

export type SongBrief = {
  topic: string;
  genre: string | null;
  mood: string | null;
  tempo: (typeof BRIEF_TEMPOS)[number] | null;
  length: keyof typeof BRIEF_LENGTHS;
  language: keyof typeof BRIEF_LANGUAGES;
  keywords: string;
};

export const EMPTY_BRIEF: SongBrief = {
  topic: '',
  genre: null,
  mood: null,
  tempo: null,
  length: 'short',
  language: 'ko',
  keywords: ''
};

export function buildBriefPrompt(brief: SongBrief) {
  const lines = [
    brief.topic.trim() ? `주제: ${brief.topic.trim()}` : null,
    brief.genre ? `장르: ${brief.genre}` : null,
    brief.mood ? `분위기: ${brief.mood}` : null,
    brief.tempo ? `템포: ${brief.tempo}` : null,
    brief.keywords.trim() ? `꼭 넣을 단어·표현: ${brief.keywords.trim()}` : null,
    `구성: ${BRIEF_LENGTHS[brief.length]}`,
    `언어: ${BRIEF_LANGUAGES[brief.language]}`
  ].filter(Boolean);

  return `이런 노래 가사를 써줘.\n${lines.map(line => `- ${line}`).join('\n')}`;
}
