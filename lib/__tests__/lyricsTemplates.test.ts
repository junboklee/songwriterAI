import { hasFinalConsonant } from '@/lib/hangul';
import { checkSingability } from '@/lib/singability';
import {
  OCCASIONS,
  PARENTS,
  SEASONS,
  makeLyrics,
  makerHrefForTopic,
  makerPrompt,
  parseOccasion,
  withAnd,
  type MakerInput
} from '@/lib/lyricsTemplates';

const base: MakerInput = {
  occasion: 'birthday',
  name: '지민',
  partner: '',
  parent: 'mom',
  place: '',
  season: 'spring',
  mood: 'bright',
  vocal: 'female'
};

describe('makeLyrics', () => {
  it('fills a birthday song with the name, place and season', () => {
    const { title, lyrics, style } = makeLyrics({ ...base, place: '한강에서', season: 'winter' });
    expect(title).toBe('지민의 날');
    expect(lyrics).toContain('[Verse 1]\n한강에서 함께 웃던 날\n하얀 입김 나누던 그 겨울');
    expect(lyrics).toContain('지민아 생일 축하해');
    expect(lyrics).toContain('[Outro]\n지민아 태어나 줘서 고마워');
    expect(style).toBe('upbeat acoustic pop, handclaps, cheerful and warm, 110 bpm, Korean female vocal');
  });

  it('picks the particle from the last syllable and falls back without a name', () => {
    expect(makeLyrics({ ...base, name: '수아' }).lyrics).toContain('수아야 생일 축하해');
    expect(makeLyrics({ ...base, name: 'Mia' }).lyrics).toContain('Mia 생일 축하해');
    const unnamed = makeLyrics({ ...base, name: '  ' });
    expect(unnamed.title).toBe('너의 날');
    expect(unnamed.lyrics).toContain('친구야 생일 축하해');
    expect(unnamed.lyrics).toContain('우리 동네에서 함께 웃던 날');
  });

  it('writes to the chosen parent', () => {
    const { title, lyrics, style } = makeLyrics({ ...base, occasion: 'parents', parent: 'both', mood: 'calm', vocal: 'male' });
    expect(title).toBe('고마워요 엄마 아빠');
    expect(lyrics).toContain('사랑해요 나의 엄마 아빠');
    expect(lyrics).not.toContain('지민');
    expect(style).toBe('emotional piano ballad, soft strings, sincere, 72 bpm, Korean male vocal');
  });

  it('names the couple only when both names are given', () => {
    expect(makeLyrics({ ...base, occasion: 'wedding', name: '민준', partner: '서연' }).lyrics).toContain('민준과 서연 결혼 축하해요');
    expect(makeLyrics({ ...base, occasion: 'wedding', name: '민준' }).lyrics).toContain('두 사람 결혼 축하해요');
  });

  it('strips markup and caps what is typed', () => {
    const { lyrics } = makeLyrics({ ...base, name: '<지민>!!', place: '아주아주아주아주 긴 동네 이름이 들어가는 곳에서' });
    expect(lyrics).toContain('지민아 생일 축하해');
    expect(lyrics).not.toMatch(/[<>!]/);
    expect(lyrics.split('\n')[1].length).toBeLessThanOrEqual(30);
  });

  it('is easy to sing for every occasion, parent and season', () => {
    for (const occasion of OCCASIONS) {
      for (const season of SEASONS) {
        for (const parent of PARENTS) {
          const { lyrics } = makeLyrics({ ...base, occasion: occasion.id, season: season.id, parent: parent.id, partner: '서연' });
          const warnings = checkSingability(lyrics).filter(issue => issue.severity === 'warn');
          expect({ occasion: occasion.id, season: season.id, parent: parent.id, warnings }).toEqual({
            occasion: occasion.id,
            season: season.id,
            parent: parent.id,
            warnings: []
          });
        }
      }
    }
  });
});

describe('helpers', () => {
  it('links the matching topic pages to the maker with the occasion picked', () => {
    expect(makerHrefForTopic('birthday-song')).toBe('/lyrics/maker?for=birthday');
    expect(makerHrefForTopic('parents-day-song')).toBe('/lyrics/maker?for=parents');
    expect(makerHrefForTopic('wedding-song')).toBe('/lyrics/maker?for=wedding');
    expect(makerHrefForTopic('crush-song')).toBe('/lyrics/maker?for=love');
    expect(makerHrefForTopic('graduation-song')).toBe('/lyrics/maker?for=graduation');
    expect(makerHrefForTopic('exam-cheer-song')).toBe('/lyrics/maker?for=cheer');
    expect(makerHrefForTopic('breakup-song')).toBeNull();
    // A sports cheer chant is not a personal pep talk.
    expect(makerHrefForTopic('cheer-song')).toBeNull();
    expect(parseOccasion('wedding')).toBe('wedding');
    expect(parseOccasion('<script>')).toBeNull();
    expect(parseOccasion(null)).toBeNull();
  });

  it('tells whether a word ends in a final consonant', () => {
    expect(hasFinalConsonant('지민')).toBe(true);
    expect(hasFinalConsonant('수아')).toBe(false);
    expect(hasFinalConsonant('Mia')).toBeNull();
    expect(withAnd('민준')).toBe('민준과');
    expect(withAnd('하나')).toBe('하나와');
  });

  it('asks Dayeon for an original song with the same details', () => {
    expect(makerPrompt({ ...base, place: '한강' })).toBe(
      '지민의 생일 축하 노래 가사를 새로 써 줘. 기억나는 곳은 한강, 계절은 봄이야. 우리만의 이야기가 더 들어가게 나한테 질문해 줘.'
    );
    expect(makerPrompt({ ...base, occasion: 'parents', parent: 'dad' })).toMatch(/^아빠께 드리는 감사 노래 가사를 새로 써 줘\. 계절은 봄이야\./);
    expect(makerPrompt({ ...base, occasion: 'wedding', name: '민준', partner: '서연' })).toMatch(/^민준과 서연의 결혼식 축가/);
    expect(makerPrompt({ ...base, occasion: 'love' })).toMatch(/^지민에게 고백하는 노래 가사/);
    expect(makerPrompt({ ...base, occasion: 'friend', name: '' })).toMatch(/^친구에게 주는 우정 노래 가사/);
    expect(makerPrompt({ ...base, occasion: 'cheer', name: '수아' })).toMatch(/^수아에게 보내는 응원 노래 가사/);
  });
});
