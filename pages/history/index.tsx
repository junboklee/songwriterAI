import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AppNav } from "@/components/AppNav";
import { RequireAuth } from "@/components/RequireAuth";
import { MainSidebar } from "@/components/MainSidebar";
import { useAuth } from "@/context/AuthContext";
import {
  buildConversationTitle,
  groupConversationsByDate,
  type ConversationSummary
} from "@/lib/conversationUtils";
import { DEFAULT_CHARACTER_NAMES } from "@/lib/defaultCharacterNames";

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  characterId: string | null;
  createdAt: string | null;
};

type ConversationDetail = {
  conversation: ConversationSummary;
  messages: ConversationMessage[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short"
});

const TIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit"
});

const HISTORY_TEXT = {
  deleteConfirm: "이 대화를 삭제할까요?",
  deleteError: "대화를 삭제하지 못했습니다.",
  clearConfirm: "모든 대화를 삭제할까요? 되돌릴 수 없습니다.",
  clearError: "전체 대화를 삭제하지 못했습니다.",
  deleting: "삭제 중...",
  clearAll: "전체 삭제",
  clearing: "삭제 중...",
  loadMore: "이전 대화 더 보기",
  loadingMore: "불러오는 중...",
  loadMoreError: "추가 대화를 불러오지 못했습니다.",
  deleteLabel: "삭제",
  headerTitle: "대화 기록",
  headerSubtitle: "날짜별로 정리된 지난 대화를 한눈에 살펴보세요.",
  loading: "대화 기록을 불러오는 중입니다...",
  empty: "아직 저장된 대화가 없어요. 새 대화를 시작해 보세요.",
  noPreview: "최근 메시지가 없습니다.",
  unknownDate: "날짜 정보를 확인할 수 없어요",
  messagesCount: (count: number) => `${count}개의 메시지`,
  conversationsCount: (count: number) => `${count}개의 대화`,
  assistantLabel: "어시스턴트",
  userLabel: "나",
  loadingMessages: "메시지를 불러오는 중입니다...",
  noMessages: "저장된 메시지가 없습니다."
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [clearingAll, setClearingAll] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [characterMap, setCharacterMap] = useState<Record<string, string>>({
    ...DEFAULT_CHARACTER_NAMES
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<
    Record<
      string,
      {
        loading: boolean;
        data?: ConversationMessage[];
        error?: string;
      }
    >
  >({});

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setNextCursor(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/profile/conversations", {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload && typeof payload.error === "string" && payload.error) ||
              "Failed to load conversations."
          );
        }

        const payload = (await response.json()) as {
          conversations: ConversationSummary[];
          nextCursor?: number | null;
        };

        if (!cancelled) {
          setConversations(payload.conversations ?? []);
          const cursorValue =
            typeof payload.nextCursor === "number" && Number.isFinite(payload.nextCursor)
              ? String(payload.nextCursor)
              : null;
          setNextCursor(cursorValue);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error ? fetchError.message : "Failed to load conversations."
          );
          setNextCursor(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !conversations.length) {
      return;
    }

    const missingIds = Array.from(
      new Set(
        conversations
          .map(conversation => conversation.characterId)
          .filter((id): id is string => {
            if (typeof id !== "string" || !id.trim()) {
              return false;
            }
            return !characterMap[id];
          })
      )
    );

    if (!missingIds.length) {
      return;
    }

    let cancelled = false;

    const loadCharacterNames = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/profile/characters/batch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ids: missingIds })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload && typeof payload.error === "string" && payload.error) ||
              "Failed to load character details."
          );
        }

        const payload = (await response.json()) as {
          characters?: Array<{ id: string; name?: string | null }>;
        };

        const nextMap = (payload.characters ?? []).reduce<Record<string, string>>(
          (acc, item) => {
            const label =
              typeof item.name === "string" && item.name.trim()
                ? item.name.trim()
                : `Character ${item.id.slice(0, 6)}`;
            acc[item.id] = label;
            return acc;
          },
          {}
        );

        missingIds.forEach(id => {
          if (!nextMap[id]) {
            nextMap[id] = `Character ${id.slice(0, 6)}`;
          }
        });

        if (!cancelled && Object.keys(nextMap).length) {
          setCharacterMap(prev => ({ ...prev, ...nextMap }));
        }
      } catch (characterError) {
        if (!cancelled) {
          console.error(characterError);
        }
      }
    };

    void loadCharacterNames();

    return () => {
      cancelled = true;
    };
  }, [user, conversations, characterMap]);

  const groups = useMemo(() => groupConversationsByDate(conversations), [conversations]);

  const handleLoadMoreConversations = async () => {
    if (!user || !nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/profile/conversations?cursor=${nextCursor}`, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === "string" && payload.error) ||
          HISTORY_TEXT.loadMoreError;
        throw new Error(message);
      }

      const items = Array.isArray(payload.conversations)
        ? (payload.conversations as ConversationSummary[])
        : [];
      setConversations(prev => [...prev, ...items]);

      const cursorValue =
        typeof payload.nextCursor === "number" && Number.isFinite(payload.nextCursor)
          ? String(payload.nextCursor)
          : null;
      setNextCursor(cursorValue);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : HISTORY_TEXT.loadMoreError);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleClearAllConversations = async () => {
    if (
      !user ||
      clearingAll ||
      !conversations.length ||
      Object.keys(deletingIds).length > 0
    ) {
      return;
    }

    if (!window.confirm(HISTORY_TEXT.clearConfirm)) {
      return;
    }

    setClearingAll(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/profile/conversations", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ scope: "all" })
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && typeof payload.error === "string" && payload.error) || HISTORY_TEXT.clearError;
        throw new Error(message);
      }

        setConversations([]);
        setCharacterMap({ ...DEFAULT_CHARACTER_NAMES });
      setMessageState({});
      setDeletingIds({});
      setExpandedId(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : HISTORY_TEXT.clearError);
    } finally {
      setClearingAll(false);
    }
  };

  const handleDeleteConversationItem = async (conversation: ConversationSummary) => {
    if (!user || deletingIds[conversation.id]) {
      return;
    }

    if (!window.confirm(HISTORY_TEXT.deleteConfirm)) {
      return;
    }

    setDeletingIds(prev => ({ ...prev, [conversation.id]: true }));
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/profile/conversations/${conversation.threadId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!response.ok && response.status !== 204 && response.status !== 404) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && typeof payload.error === "string" && payload.error) || HISTORY_TEXT.deleteError;
        throw new Error(message);
      }

      setConversations(prev => {
        const next = prev.filter(item => item.id !== conversation.id);
        setCharacterMap(previousMap => {
          const nextMap: Record<string, string> = { ...DEFAULT_CHARACTER_NAMES };
          next.forEach(item => {
            if (!item.characterId) {
              return;
            }
            const mappedName =
              previousMap[item.characterId] ||
              buildConversationTitle(
                {
                  threadId: item.threadId,
                  title: item.title,
                  characterId: item.characterId
                },
                previousMap
              );
            nextMap[item.characterId] = mappedName;
          });
          return nextMap;
        });
        return next;
      });

      setMessageState(prev => {
        const { [conversation.id]: _removed, ...rest } = prev;
        return rest;
      });

      if (expandedId === conversation.id) {
        setExpandedId(null);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : HISTORY_TEXT.deleteError);
    } finally {
      setDeletingIds(prev => {
        const next = { ...prev };
        delete next[conversation.id];
        return next;
      });
    }
  };

  const handleToggleConversation = async (conversation: ConversationSummary) => {
    if (!user || deletingIds[conversation.id]) {
      return;
    }

    setExpandedId(prev => (prev === conversation.id ? null : conversation.id));

    if (messageState[conversation.id]?.data || messageState[conversation.id]?.loading) {
      return;
    }

    setMessageState(prev => ({
      ...prev,
      [conversation.id]: {
        loading: true
      }
    }));

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/profile/conversations/${conversation.threadId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload && typeof payload.error === "string" && payload.error) ||
            "Failed to load conversation details."
        );
      }

      const payload = (await response.json()) as ConversationDetail;

      setMessageState(prev => ({
        ...prev,
        [conversation.id]: {
          loading: false,
          data: payload.messages ?? []
        }
      }));
    } catch (fetchError) {
      setMessageState(prev => ({
        ...prev,
        [conversation.id]: {
          loading: false,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load conversation details."
        }
      }));
    }
  };

  const sidebar = useMemo(() => <MainSidebar active="history" />, []);

  return (
    <RequireAuth>
      <AppShell sidebar={sidebar}>
        <AppNav
          showBrand={false}
          actions={
            <>
              <Link href="/dashboard" className="btn btn--ghost">
                대시보드
              </Link>
              <Link href="/chat" className="btn btn--ghost">
                라이브 채팅
              </Link>
              <Link href="/suno" className="btn btn--primary">
                라이브러리
              </Link>
              {conversations.length ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    void handleClearAllConversations();
                  }}
                  disabled={clearingAll || loading || Object.keys(deletingIds).length > 0}
                  style={{ marginLeft: 8 }}
                >
                  {clearingAll ? HISTORY_TEXT.clearing : HISTORY_TEXT.clearAll}
                </button>
              ) : null}
            </>
          }
        />

        <div className="history-page">
          <header className="history-page__header">
            <div>
              <h1>{HISTORY_TEXT.headerTitle}</h1>
              <p>{HISTORY_TEXT.headerSubtitle}</p>
            </div>
          </header>

          {loading ? (
            <div className="history-page__status history-page__status--loading">
              {HISTORY_TEXT.loading}
            </div>
          ) : null}

          {error ? (
            <div className="history-page__status history-page__status--error">{error}</div>
          ) : null}

          {!loading && !error && conversations.length === 0 ? (
            <div className="history-page__status">{HISTORY_TEXT.empty}</div>
          ) : null}

          {groups.map(([dateKey, items]) => {
            const displayDate =
              dateKey === "unknown"
                ? HISTORY_TEXT.unknownDate
                : DATE_FORMATTER.format(new Date(`${dateKey}T00:00:00`));

            return (
              <section key={dateKey} className="history-group">
                <header className="history-group__header">
                  <h2>{displayDate}</h2>
                  <span>{HISTORY_TEXT.conversationsCount(items.length)}</span>
                </header>

                <div className="history-group__list">
                  {items.map(item => {
                    const isExpanded = expandedId === item.id;
                    const messageInfo = messageState[item.id];
                    const cardTitle = buildConversationTitle(item, characterMap);
                    return (
                      <article key={item.id} className="history-card">
                        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                          <button
                            className="history-card__summary"
                            type="button"
                            onClick={() => handleToggleConversation(item)}
                            style={{ flex: 1 }}
                            disabled={Boolean(deletingIds[item.id])}
                          >
                            <div>
                              <p className="history-card__title">{cardTitle}</p>
                              <p className="history-card__preview">
                                {item.lastMessagePreview || HISTORY_TEXT.noPreview}
                              </p>
                            </div>
                            <div className="history-card__meta">
                              <span>{HISTORY_TEXT.messagesCount(item.messageCount)}</span>
                              {item.updatedAt ? (
                                <span>{TIME_FORMATTER.format(new Date(item.updatedAt))}</span>
                              ) : null}
                            </div>
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => {
                              void handleDeleteConversationItem(item);
                            }}
                            disabled={Boolean(deletingIds[item.id])}
                          >
                            {deletingIds[item.id] ? HISTORY_TEXT.deleting : HISTORY_TEXT.deleteLabel}
                          </button>
                        </div>

                        {isExpanded ? (
                          <div className="history-card__details">
                            {messageInfo?.loading ? (
                              <p className="history-card__status">{HISTORY_TEXT.loadingMessages}</p>
                            ) : messageInfo?.error ? (
                              <p className="history-card__status history-card__status--error">
                                {messageInfo.error}
                              </p>
                            ) : messageInfo?.data?.length ? (
                              <ul className="history-card__message-list">
                                {messageInfo.data.map(message => (
                                  <li
                                    key={message.id}
                                    className={`history-card__message history-card__message--${message.role}`}
                                  >
                                    <div className="history-card__message-meta">
                                      <span>
                                        {message.role === "assistant"
                                          ? HISTORY_TEXT.assistantLabel
                                          : HISTORY_TEXT.userLabel}
                                      </span>
                                      {message.createdAt ? (
                                        <time>{TIME_FORMATTER.format(new Date(message.createdAt))}</time>
                                      ) : null}
                                    </div>
                                    <p>{message.content}</p>
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
                  })}
                </div>
              </section>
            );
          })}

          {nextCursor ? (
            <div className="history-page__load-more">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  void handleLoadMoreConversations();
                }}
                disabled={loadingMore}
              >
                {loadingMore ? HISTORY_TEXT.loadingMore : HISTORY_TEXT.loadMore}
              </button>
            </div>
          ) : null}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
