export type SongEntry = {
  id: string;
  title: string | null;
  lyrics: string;
  prompt: string | null;
  characterId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown>;
  versionCount?: number;
  shareId?: string | null;
  aiAssisted?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};


export type SongVersion = {
  id: string;
  title: string | null;
  lyrics: string;
  style: string | null;
  source: 'initial' | 'auto-from-chat' | 'manual' | 'restore';
  createdAt: string | null;
};
