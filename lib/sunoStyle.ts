// Options for the free Suno style-prompt builder (/lyrics/style). Tags are English because music
// generators read English style tags best (same rule as the <style> line in lib/songwritingPrompt).
// No artist or song names, for the same reason the songwriting prompt forbids them.

export type StyleOption = { tag: string; name: string };
export type StyleField = 'genre' | 'mood' | 'tempo' | 'vocal' | 'instruments';
export type StyleChoice = Record<StyleField, string[]>;

export const STYLE_FIELDS: { id: StyleField; name: string; max: number; options: StyleOption[] }[] = [
  {
    id: 'genre',
    name: '장르',
    max: 1,
    options: [
      { tag: 'k-pop', name: '케이팝' },
      { tag: 'acoustic ballad', name: '어쿠스틱 발라드' },
      { tag: 'piano ballad', name: '피아노 발라드' },
      { tag: 'indie pop', name: '인디 팝' },
      { tag: 'city pop', name: '시티팝' },
      { tag: 'r&b', name: '알앤비' },
      { tag: 'hip hop', name: '힙합' },
      { tag: 'lo-fi', name: '로파이' },
      { tag: 'rock', name: '록' },
      { tag: 'trot', name: '트로트' },
      { tag: 'folk', name: '포크' },
      { tag: 'jazz', name: '재즈' },
      { tag: 'edm', name: 'EDM' },
      { tag: 'children\'s song', name: '동요' },
      { tag: 'jingle', name: 'CM송' },
      { tag: 'lullaby', name: '자장가' }
    ]
  },
  {
    id: 'mood',
    name: '분위기',
    max: 2,
    options: [
      { tag: 'warm', name: '따뜻한' },
      { tag: 'bright', name: '밝은' },
      { tag: 'joyful', name: '신나는' },
      { tag: 'romantic', name: '설레는' },
      { tag: 'wistful', name: '아련한' },
      { tag: 'sad', name: '슬픈' },
      { tag: 'hopeful', name: '희망찬' },
      { tag: 'nostalgic', name: '그리운' },
      { tag: 'calm', name: '잔잔한' },
      { tag: 'dreamy', name: '몽환적인' },
      { tag: 'powerful', name: '힘 있는' },
      { tag: 'playful', name: '장난스러운' }
    ]
  },
  {
    id: 'tempo',
    name: '빠르기',
    max: 1,
    options: [
      { tag: '65 bpm', name: '아주 느리게 (65)' },
      { tag: '75 bpm', name: '느리게 (75)' },
      { tag: '95 bpm', name: '보통 (95)' },
      { tag: '115 bpm', name: '경쾌하게 (115)' },
      { tag: '128 bpm', name: '빠르게 (128)' }
    ]
  },
  {
    id: 'vocal',
    name: '보컬',
    max: 1,
    options: [
      { tag: 'soft female vocal', name: '부드러운 여성 보컬' },
      { tag: 'clear female vocal', name: '맑은 여성 보컬' },
      { tag: 'warm male vocal', name: '따뜻한 남성 보컬' },
      { tag: 'husky male vocal', name: '허스키한 남성 보컬' },
      { tag: 'male and female duet', name: '남녀 듀엣' },
      { tag: 'children\'s choir', name: '어린이 합창' },
      { tag: 'rap vocal', name: '랩' }
    ]
  },
  {
    id: 'instruments',
    name: '악기',
    max: 3,
    options: [
      { tag: 'piano', name: '피아노' },
      { tag: 'acoustic guitar', name: '어쿠스틱 기타' },
      { tag: 'electric guitar', name: '일렉 기타' },
      { tag: 'strings', name: '현악기' },
      { tag: 'synth', name: '신시사이저' },
      { tag: 'bass', name: '베이스' },
      { tag: 'drums', name: '드럼' },
      { tag: '808', name: '808 베이스' },
      { tag: 'brass', name: '브라스' },
      { tag: 'ukulele', name: '우쿨렐레' },
      { tag: 'music box', name: '오르골' },
      { tag: 'accordion', name: '아코디언' }
    ]
  }
];

export const EMPTY_STYLE: StyleChoice = { genre: [], mood: [], tempo: [], vocal: [], instruments: [] };

// Starting points matched to the /lyrics topic pages, so each preset can link to its guide.
export const STYLE_PRESETS: { name: string; topic: string; choice: StyleChoice }[] = [
  {
    name: '생일 축하',
    topic: 'birthday-song',
    choice: { genre: ['acoustic ballad'], mood: ['warm', 'bright'], tempo: ['95 bpm'], vocal: ['clear female vocal'], instruments: ['acoustic guitar', 'piano'] }
  },
  {
    name: '결혼식 축가',
    topic: 'wedding-song',
    choice: { genre: ['piano ballad'], mood: ['romantic', 'warm'], tempo: ['75 bpm'], vocal: ['male and female duet'], instruments: ['piano', 'strings'] }
  },
  {
    name: '이별',
    topic: 'breakup-song',
    choice: { genre: ['piano ballad'], mood: ['sad', 'wistful'], tempo: ['65 bpm'], vocal: ['husky male vocal'], instruments: ['piano', 'strings'] }
  },
  {
    name: '트로트',
    topic: 'trot-lyrics',
    choice: { genre: ['trot'], mood: ['joyful', 'nostalgic'], tempo: ['115 bpm'], vocal: ['warm male vocal'], instruments: ['accordion', 'brass', 'drums'] }
  },
  {
    name: '랩',
    topic: 'rap-lyrics',
    choice: { genre: ['hip hop'], mood: ['powerful'], tempo: ['95 bpm'], vocal: ['rap vocal'], instruments: ['808', 'drums', 'synth'] }
  },
  {
    name: '동요',
    topic: 'kids-song',
    choice: { genre: ['children\'s song'], mood: ['bright', 'playful'], tempo: ['115 bpm'], vocal: ['children\'s choir'], instruments: ['ukulele', 'piano'] }
  },
  {
    name: '자장가',
    topic: 'lullaby',
    choice: { genre: ['lullaby'], mood: ['calm', 'warm'], tempo: ['65 bpm'], vocal: ['soft female vocal'], instruments: ['music box', 'piano'] }
  },
  {
    name: 'CM송',
    topic: 'jingle-song',
    choice: { genre: ['jingle'], mood: ['bright', 'playful'], tempo: ['128 bpm'], vocal: ['clear female vocal'], instruments: ['ukulele', 'brass', 'drums'] }
  }
];

const ORDER: StyleField[] = ['genre', 'mood', 'tempo', 'vocal', 'instruments'];

// Comma-separated tags in a fixed order (genre first carries the most weight), with an optional
// free-text extra trimmed and stripped of commas the user may have doubled.
export function buildStylePrompt(choice: StyleChoice, extra = '') {
  const tags = ORDER.flatMap(field => choice[field]);
  const extraTags = extra
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  return [...tags, ...extraTags].join(', ');
}

// Toggles one option, dropping the oldest pick when the field is full so a tap always does something.
export function toggleStyle(choice: StyleChoice, field: StyleField, tag: string): StyleChoice {
  const max = STYLE_FIELDS.find(item => item.id === field)?.max ?? 1;
  const current = choice[field];
  const next = current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag].slice(-max);
  return { ...choice, [field]: next };
}
