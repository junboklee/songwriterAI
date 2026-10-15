import { toDisplayText } from '@/lib/lyricsFormat';
import type { ConversationSummary } from '@/lib/conversationUtils';

export type HistoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  characterId: string | null;
  createdAt: string | null;
};

export type HistoryMessageState = {
  loading: boolean;
  data?: HistoryMessage[];
  error?: string;
};

export const HISTORY_TEXT = {
  deleteConfirm: '이 대화를 삭제할까요?',
  deleteError: '대화를 삭제하지 못했습니다.',
  clearConfirm: '모든 대화를 삭제할까요? 되돌릴 수 없습니다.',
  clearError: '전체 대화를 삭제하지 못했습니다.',
  deleting: '삭제 중...',
  clearAll: '전체 삭제',
  clearing: '삭제 중...',
  loadMore: '이전 대화 더 보기',
  loadingMore: '불러오는 중...',
  loadMoreError: '추가 대화를 불러오지 못했습니다.',
  deleteLabel: '삭제',
  headerTitle: '대화 기록',
  headerSubtitle: '날짜별로 정리된 지난 대화를 한눈에 살펴보세요.',
  loading: '대화 기록을 불러오는 중입니다...',
  empty: '아직 저장된 대화가 없어요. 새 대화를 시작해 보세요.',
  noPreview: '최근 메시지가 없습니다.',
  unknownDate: '날짜 정보를 확인할 수 없어요',
  messagesCount: (count: number) => `${count}개의 메시지`,
  conversationsCount: (count: number) => `${count}개의 대화`,
  assistantLabel: '어시스턴트',
  userLabel: '나',
  loadingMessages: '메시지를 불러오는 중입니다...',
  noMessages: '저장된 메시지가 없습니다.'
};

export const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short'
});

const TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit'
});

type HistoryConversationCardProps = {
  conversation: ConversationSummary;
  title: string;
  expanded: boolean;
  deleting: boolean;
  messages?: HistoryMessageState;
  onToggle: () => void;
  onDelete: () => void;
};

export function HistoryConversationCard({
  conversation,
  title,
  expanded,
  deleting,
  messages,
  onToggle,
  onDelete
}: HistoryConversationCardProps) {
  return (
    <article className="history-card">
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <button
          className="history-card__summary"
          type="button"
          onClick={onToggle}
          style={{ flex: 1 }}
          disabled={deleting}
        >
          <div>
            <p className="history-card__title">{title}</p>
            <p className="history-card__preview">
              {conversation.lastMessagePreview
                ? toDisplayText(conversation.lastMessagePreview)
                : HISTORY_TEXT.noPreview}
            </p>
          </div>
          <div className="history-card__meta">
            <span>{HISTORY_TEXT.messagesCount(conversation.messageCount)}</span>
            {conversation.updatedAt ? <span>{TIME_FORMATTER.format(new Date(conversation.updatedAt))}</span> : null}
          </div>
        </button>
        <button type="button" className="btn btn--ghost" onClick={onDelete} disabled={deleting}>
          {deleting ? HISTORY_TEXT.deleting : HISTORY_TEXT.deleteLabel}
        </button>
      </div>

      {expanded ? (
        <div className="history-card__details">
          {messages?.loading ? (
            <p className="history-card__status">{HISTORY_TEXT.loadingMessages}</p>
          ) : messages?.error ? (
            <p className="history-card__status history-card__status--error">{messages.error}</p>
          ) : messages?.data?.length ? (
            <ul className="history-card__message-list">
              {messages.data.map(message => (
                <li key={message.id} className={`history-card__message history-card__message--${message.role}`}>
                  <div className="history-card__message-meta">
                    <span>{message.role === 'assistant' ? HISTORY_TEXT.assistantLabel : HISTORY_TEXT.userLabel}</span>
                    {message.createdAt ? <time>{TIME_FORMATTER.format(new Date(message.createdAt))}</time> : null}
                  </div>
                  {/* Assistant replies carry <lyrics>/<style> markup; show them the way the chat does. */}
                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    {message.role === 'assistant' ? toDisplayText(message.content) : message.content}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="history-card__status">{HISTORY_TEXT.noMessages}</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
