import { breadcrumbJsonLd } from '@/components/TopicLayout';

describe('breadcrumbJsonLd', () => {
  it('walks from the site through /lyrics to the page', () => {
    expect(breadcrumbJsonLd('라임 찾기', '/lyrics/rhyme').itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'NovaSingerAI', item: 'https://novasingerai.com' },
      { '@type': 'ListItem', position: 2, name: '주제별 가사 만들기', item: 'https://novasingerai.com/lyrics' },
      { '@type': 'ListItem', position: 3, name: '라임 찾기', item: 'https://novasingerai.com/lyrics/rhyme' }
    ]);
  });

  it('stops at /lyrics on the index page', () => {
    expect(breadcrumbJsonLd('노래 가사 만들기', '/lyrics').itemListElement).toHaveLength(2);
  });
});
