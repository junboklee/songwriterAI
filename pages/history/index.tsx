import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AppNav } from "@/components/AppNav";
import { RequireAuth } from "@/components/RequireAuth";
import { MainSidebar } from "@/components/MainSidebar";
import {
  DATE_FORMATTER,
  HISTORY_TEXT,
  HistoryConversationCard,
  type HistoryMessage,
  type HistoryMessageState
} from "@/components/history/HistoryConversationCard";
import { useAuth } from "@/context/AuthContext";
import { useCharacterNameMap } from "@/hooks/useCharacterNameMap";
import {
  buildConversationTitle,
  groupConversationsByDate,
  type ConversationSummary
} from "@/lib/conversationUtils";
import { DEFAULT_CHARACTER_NAMES } from "@/lib/defaultCharacterNames";

export default function HistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [clearingAll, setClearingAll] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [characterMap, setCharacterMap] = useCharacterNameMap(
    user,
    conversations.map(conversation => conversation.characterId)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<Record<string, HistoryMessageState>>({});

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

      const payload = (await response.json()) as { messages?: HistoryMessage[] };

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
        <div className="history-page__nav page-actions-bar">
          <AppNav
            showBrand={false}
            actions={
              <>
                <Link href="/dashboard" className="btn btn--ghost">
                  대시보드
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
        </div>

        <div className="history-page">
          <header className="history-page__header">
            <div>
              <h1>{HISTORY_TEXT.headerTitle}</h1>
              <p>{HISTORY_TEXT.headerSubtitle}</p>
            </div>
          </header>

          {loading ? (
            <div className="history-page__status history-page__status--loading">{HISTORY_TEXT.loading}</div>
          ) : null}

          {error ? <div className="history-page__status history-page__status--error">{error}</div> : null}

          {!loading && !error && conversations.length === 0 ? (
            <div className="history-page__status">{HISTORY_TEXT.empty}</div>
          ) : null}

          {groups.map(([dateKey, items]) => (
            <section key={dateKey} className="history-group">
              <header className="history-group__header">
                <h2>
                  {dateKey === "unknown"
                    ? HISTORY_TEXT.unknownDate
                    : DATE_FORMATTER.format(new Date(`${dateKey}T00:00:00`))}
                </h2>
                <span>{HISTORY_TEXT.conversationsCount(items.length)}</span>
              </header>

              <div className="history-group__list">
                {items.map(item => (
                  <HistoryConversationCard
                    key={item.id}
                    conversation={item}
                    title={buildConversationTitle(item, characterMap)}
                    expanded={expandedId === item.id}
                    deleting={Boolean(deletingIds[item.id])}
                    messages={messageState[item.id]}
                    onToggle={() => void handleToggleConversation(item)}
                    onDelete={() => void handleDeleteConversationItem(item)}
                  />
                ))}
              </div>
            </section>
          ))}

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
