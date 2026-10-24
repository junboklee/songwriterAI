// Wording for the AI Basic Act (인공지능 발전과 신뢰 기반 조성 등에 관한 기본법, in force 2026-01-22):
// tell users in advance that the service runs on generative AI, and label what it generates.
// Keep every label here so the chat, share pages and share images say the same thing.

export const AI_SERVICE_NOTICE = 'NovaSingerAI는 OpenAI의 생성형 AI 모델로 대화 답변과 가사를 만드는 서비스예요.';
export const AI_OUTPUT_CAVEAT = 'AI가 만든 결과물은 부정확하거나 기존 곡과 비슷할 수 있어요.';

export const AI_BADGE = 'AI';
export const AI_LYRICS_LABEL = 'AI 생성 가사';
export const AI_SHARE_LABEL = 'AI 생성 · 생성형 AI와 함께 쓴 가사';
export const HUMAN_SHARE_LABEL = 'NovaSingerAI에서 공유한 가사';

type SongLike = {
  aiAssisted?: unknown;
  threadId?: unknown;
  metadata?: { source?: unknown } | null;
};

// A song counts as AI-assisted when it came from a chat or an AI rewrite was saved into it.
export function isAiAssisted(song: SongLike) {
  return (
    song.aiAssisted === true ||
    (typeof song.threadId === 'string' && song.threadId.length > 0) ||
    song.metadata?.source === 'auto-from-chat' ||
    // Lyrics written in the no-signup trial and saved after sign-up.
    song.metadata?.source === 'trial'
  );
}
