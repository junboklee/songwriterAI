import { render, screen } from '@testing-library/react';

import { HistoryConversationCard } from '@/components/history/HistoryConversationCard';
import { adaptCharacter } from '@/hooks/useCharacterPage';

const conversation = {
  id: 'c1',
  threadId: 't1',
  title: null,
  characterId: '1',
  lastMessagePreview: '<lyrics title="밤">\n[Verse 1]\n별이 빛나',
  messageCount: 2,
  updatedAt: null,
  createdAt: null
} as never;

describe('HistoryConversationCard', () => {
  it('shows assistant replies without the <lyrics>/<style> markup', () => {
    const { container } = render(
      <HistoryConversationCard
        conversation={conversation}
        title="Dayeon"
        expanded
        deleting={false}
        messages={{
          loading: false,
          data: [
            {
              id: 'm1',
              role: 'assistant',
              content: '좋아!\n<lyrics title="밤">\n[Verse 1]\n별이 빛나\n</lyrics>\n<style>ballad</style>',
              characterId: '1',
              createdAt: null
            }
          ]
        }}
        onToggle={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(container.textContent).not.toMatch(/<\/?lyrics|<\/?style/);
    expect(container.textContent).toContain('🎵 밤');
    expect(screen.getByText(/스타일: ballad/)).toBeTruthy();
  });
});

describe('adaptCharacter', () => {
  it('falls back between summary fields and defaults visibility to private', () => {
    expect(adaptCharacter({ name: ' Muse ', shortDescription: '작사가', visibility: 'secret' }, 'abcdef123')).toMatchObject({
      id: 'abcdef123',
      name: 'Muse',
      summary: '작사가',
      visibility: 'private'
    });
  });
});
