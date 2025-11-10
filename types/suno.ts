export type SongEntry = {
  id: string;
  title: string | null;
  lyrics: string;
  prompt: string | null;
  characterId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

