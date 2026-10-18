import { appendSongVersion } from '@/lib/songVersions';

const tx = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn()
};

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    runTransaction: jest.fn(async (fn: (transaction: typeof tx) => Promise<void>) => fn(tx)),
    batch: jest.fn(),
    collection: jest.fn((name: string) => ({ doc: jest.fn((id: string) => ({ path: `${name}/${id}` })) }))
  }
}));

let versionIds = 0;
const versionsCollection = {
  doc: jest.fn(() => ({ id: `v${(versionIds += 1)}` })),
  orderBy: jest.fn(() => ({
    offset: jest.fn(() => ({ get: jest.fn(async () => ({ empty: true, docs: [], size: 0 })) }))
  }))
};
const songRef = { collection: jest.fn(() => versionsCollection) } as never;

const snapshot = (data: Record<string, unknown> | null) => ({
  exists: data !== null,
  data: () => data ?? undefined
});

describe('appendSongVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    versionIds = 0;
  });

  it('preserves the original lyrics of a pre-versioning song as an initial version', async () => {
    tx.get.mockResolvedValue(snapshot({ title: 'Old', lyrics: 'old lyrics', metadata: {} }));

    await appendSongVersion(songRef, { title: 'New', lyrics: 'new lyrics', source: 'manual' });

    const versionWrites = tx.set.mock.calls.map(call => call[1]);
    expect(versionWrites).toEqual([
      expect.objectContaining({ lyrics: 'old lyrics', source: 'initial' }),
      expect.objectContaining({ lyrics: 'new lyrics', source: 'manual' })
    ]);
    expect(tx.update).toHaveBeenCalledWith(
      songRef,
      expect.objectContaining({ title: 'New', lyrics: 'new lyrics' })
    );
  });

  it('writes a single version for an already versioned song and syncs the style', async () => {
    tx.get.mockResolvedValue(snapshot({ title: 'Song', lyrics: 'v1', versionCount: 1 }));

    await appendSongVersion(songRef, {
      title: 'Song',
      lyrics: 'v2',
      style: 'city pop',
      source: 'auto-from-chat'
    });

    expect(tx.set).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledWith(
      songRef,
      expect.objectContaining({ lyrics: 'v2', 'metadata.style': 'city pop' })
    );
  });

  it('updates the public share copy when the song is shared', async () => {
    tx.get.mockResolvedValue(snapshot({ title: 'Song', lyrics: 'v1', versionCount: 1, shareId: 'share-1' }));

    await appendSongVersion(songRef, { title: 'Song', lyrics: 'v2', source: 'manual' });

    expect(tx.set).toHaveBeenCalledWith(
      { path: 'sharedSongs/share-1' },
      expect.objectContaining({ title: 'Song', lyrics: 'v2' }),
      { merge: true }
    );
  });

  it('marks the song and its share page as AI-assisted when an AI rewrite was saved', async () => {
    tx.get.mockResolvedValue(snapshot({ title: 'Song', lyrics: 'v1', versionCount: 1, shareId: 'share-1' }));

    await appendSongVersion(songRef, { title: 'Song', lyrics: 'v2', source: 'manual', aiAssisted: true });

    expect(tx.update).toHaveBeenCalledWith(songRef, expect.objectContaining({ aiAssisted: true }));
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'sharedSongs/share-1' },
      expect.objectContaining({ aiAssisted: true }),
      { merge: true }
    );
  });

  it('keeps a hand-written song unmarked', async () => {
    tx.get.mockResolvedValue(snapshot({ title: 'Song', lyrics: 'v1', versionCount: 1, shareId: 'share-1' }));

    await appendSongVersion(songRef, { title: 'Song', lyrics: 'v2', source: 'manual' });

    expect(tx.update.mock.calls[0][1]).not.toHaveProperty('aiAssisted');
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'sharedSongs/share-1' },
      expect.objectContaining({ aiAssisted: false }),
      { merge: true }
    );
  });

  it('fails when the song no longer exists', async () => {
    tx.get.mockResolvedValue(snapshot(null));

    await expect(
      appendSongVersion(songRef, { title: null, lyrics: 'x', source: 'manual' })
    ).rejects.toThrow('SONG_NOT_FOUND');
  });
});
