import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { User } from 'firebase/auth';

import { useCharacterNameMap } from '@/hooks/useCharacterNameMap';
import type { DashboardText } from '@/hooks/useDashboardText';
import { authedJson, errorMessage } from '@/lib/authedFetch';
import {
  adaptCharacter,
  adaptConversation,
  sortCharacters,
  type CharacterApiItem,
  type ConversationApiItem,
  type ConversationListItem,
  type ProfileResponse,
  type UserCharacter
} from '@/lib/dashboard/model';

type Resource<T> = {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
};

type ResourceOptions<T> = {
  // 'required': skip the request and stay empty while signed out. 'optional': send the token if any.
  auth: 'required' | 'optional';
  empty: T;
  fallbackError: string;
  parse: (payload: unknown) => T;
};

// Loads one GET endpoint for the dashboard and reloads when the user changes.
function useResource<T>(user: User | null, url: string, options: ResourceOptions<T>): Resource<T> {
  const { auth, fallbackError } = options;
  const [data, setData] = useState<T>(options.empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Refs so inline parse/empty values don't retrigger the request on every render.
  const parseRef = useRef(options.parse);
  parseRef.current = options.parse;
  const emptyRef = useRef(options.empty);

  useEffect(() => {
    if (auth === 'required' && !user) {
      setData(emptyRef.current);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    authedJson(user, url, fallbackError)
      .then(payload => {
        if (payload === null) {
          throw new Error(fallbackError);
        }
        if (!cancelled) {
          setData(parseRef.current(payload));
        }
      })
      .catch(loadError => {
        if (!cancelled) {
          setError(errorMessage(loadError, fallbackError));
          setData(emptyRef.current);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, url, auth, fallbackError]);

  return { data, setData, loading, error, setError };
}

const listOf = <T,>(payload: unknown, key: string): T[] => {
  const value = (payload as Record<string, unknown> | null)?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
};

const EMPTY_CHARACTERS: UserCharacter[] = [];
const EMPTY_CHATS: ConversationListItem[] = [];

// Dashboard data (my characters, public showcase, profile, recent chats, character names) and the
// mutations that keep it in sync. UI state (dialogs, search, sort) stays in the page.
export function useDashboardData(user: User | null, text: DashboardText) {
  const myCharacters = useResource(user, '/api/profile/characters?limit=20', {
    auth: 'required',
    empty: EMPTY_CHARACTERS,
    fallbackError: text.charactersLoadError,
    parse: payload => sortCharacters(listOf<CharacterApiItem>(payload, 'characters').map(adaptCharacter))
  });

  // The explore API already returns characters ordered by likes and chats.
  const publicCharacters = useResource(user, '/api/characters/explore?limit=12&sort=popular', {
    auth: 'optional',
    empty: EMPTY_CHARACTERS,
    fallbackError: text.showcaseLoadError,
    parse: payload => listOf<CharacterApiItem>(payload, 'characters').map(adaptCharacter)
  });

  const profile = useResource<ProfileResponse | null>(user, '/api/profile', {
    auth: 'required',
    empty: null,
    fallbackError: text.profileLoadError,
    parse: payload => payload as ProfileResponse
  });

  const recentChats = useResource(user, '/api/profile/conversations?limit=5', {
    auth: 'required',
    empty: EMPTY_CHATS,
    fallbackError: text.recentChatsLoadError,
    parse: payload =>
      listOf<ConversationApiItem>(payload, 'conversations').map(item => adaptConversation(item, text.noMessagesYet))
  });

  // Names come from the user's own characters first; other ids (recent chats, recently used
  // characters) are fetched in one batch. Conversation titles are never used as character names.
  const ownIds = new Set(myCharacters.data.map(character => character.id));
  const [fetchedNames] = useCharacterNameMap(
    user,
    [...recentChats.data.map(chat => chat.characterId), ...(profile.data?.profile.recentCharacterIds ?? [])].filter(
      id => !id || !ownIds.has(id)
    )
  );
  const characterNames = useMemo(() => {
    const names = { ...fetchedNames };
    myCharacters.data.forEach(character => {
      if (character.id && character.name) {
        names[character.id] = character.name;
      }
    });
    return names;
  }, [fetchedNames, myCharacters.data]);

  const [deletingRecentIds, setDeletingRecentIds] = useState<Record<string, boolean>>({});
  const [isClearingRecentChats, setIsClearingRecentChats] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const deleteRecentChat = async (threadId: string) => {
    if (!user || deletingRecentIds[threadId]) {
      return;
    }
    setDeletingRecentIds(prev => ({ ...prev, [threadId]: true }));
    recentChats.setError(null);
    try {
      await authedJson(user, `/api/profile/conversations/${encodeURIComponent(threadId)}`, text.deleteRecentChatError, {
        method: 'DELETE',
        okStatuses: [404]
      });
      recentChats.setData(prev => prev.filter(item => item.threadId !== threadId));
    } catch (error) {
      recentChats.setError(errorMessage(error, text.deleteRecentChatError));
    } finally {
      setDeletingRecentIds(prev => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
    }
  };

  const clearRecentChats = async () => {
    if (!user || isClearingRecentChats || !recentChats.data.length || Object.keys(deletingRecentIds).length > 0) {
      return;
    }
    setIsClearingRecentChats(true);
    recentChats.setError(null);
    try {
      await authedJson(user, '/api/profile/conversations', text.clearRecentChatsError, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' })
      });
      recentChats.setData([]);
      setDeletingRecentIds({});
    } catch (error) {
      recentChats.setError(errorMessage(error, text.clearRecentChatsError));
    } finally {
      setIsClearingRecentChats(false);
    }
  };

  // Returns true when the character was deleted; failures are shown in the my-characters section.
  const deleteCharacter = async (characterId: string) => {
    if (!user) {
      myCharacters.setError(text.deleteError);
      return false;
    }
    setPendingDeleteId(characterId);
    try {
      await authedJson(user, `/api/profile/characters/${encodeURIComponent(characterId)}`, text.deleteError, {
        method: 'DELETE'
      });
      myCharacters.setData(prev => prev.filter(item => item.id !== characterId));
      myCharacters.setError(null);
      return true;
    } catch (error) {
      myCharacters.setError(errorMessage(error, text.deleteError));
      return false;
    } finally {
      setPendingDeleteId(null);
    }
  };

  // Throws on failure so the editor panel can show the message.
  const updateCharacter = async (characterId: string, form: FormData) => {
    const body = await authedJson<{ character?: CharacterApiItem }>(
      user,
      `/api/profile/characters/${encodeURIComponent(characterId)}`,
      text.updateError,
      { method: 'PATCH', body: form }
    );
    if (!body?.character || typeof body.character.id !== 'string') {
      throw new Error(text.updateError);
    }
    const updated = adaptCharacter(body.character);
    myCharacters.setData(prev =>
      sortCharacters(
        prev.some(item => item.id === updated.id)
          ? prev.map(item => (item.id === updated.id ? updated : item))
          : [...prev, updated]
      )
    );
    myCharacters.setError(null);
    return updated;
  };

  // Throws on failure so the nickname dialog can show the message.
  const saveDisplayName = async (displayName: string) => {
    await authedJson(user, '/api/profile', text.nicknameError, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName })
    });
    profile.setData(prev => (prev ? { ...prev, profile: { ...prev.profile, displayName } } : prev));
  };

  return {
    myCharacters,
    publicCharacters,
    profile,
    recentChats,
    characterNames,
    deletingRecentIds,
    isClearingRecentChats,
    pendingDeleteId,
    deleteRecentChat,
    clearRecentChats,
    deleteCharacter,
    updateCharacter,
    saveDisplayName
  };
}
