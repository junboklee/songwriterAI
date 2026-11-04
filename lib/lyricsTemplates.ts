// Fill-in lyrics for the free maker page (/lyrics/maker): our own templates, written for this
// site, filled with a name, a place and a season in the browser. No AI call, so it keeps working
// while the AI can't answer.

export type Occasion = 'birthday' | 'parents' | 'wedding';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Mood = 'bright' | 'calm';
export type Vocal = 'female' | 'male';
export type Parent = 'mom' | 'dad' | 'both';

export type MakerInput = {
  occasion: Occasion;
  // Birthday: the person the song is for. Wedding: the two people getting married.
  name: string;
  partner: string;
  parent: Parent;
  place: string;
  season: Season;
  mood: Mood;
  vocal: Vocal;
};

export const MAX_NAME = 10;
export const MAX_PLACE = 20;

export const OCCASIONS: { id: Occasion; label: string }[] = [
  { id: 'birthday', label: '생일 축하' },
  { id: 'parents', label: '부모님께 감사' },
  { id: 'wedding', label: '결혼 축가' }
];

export const SEASONS: { id: Season; label: string }[] = [
  { id: 'spring', label: '봄' },
  { id: 'summer', label: '여름' },
  { id: 'autumn', label: '가을' },
  { id: 'winter', label: '겨울' }
];

export const PARENTS: { id: Parent; label: string }[] = [
  { id: 'mom', label: '엄마' },
  { id: 'dad', label: '아빠' },
  { id: 'both', label: '엄마 아빠' }
];

const SEASON_LINE: Record<Season, string> = {
  spring: '벚꽃 잎이 흩날리던 그날',
  summer: '매미 소리 가득하던 그 여름',
  autumn: '낙엽 밟는 소리마저 좋던 날',
  winter: '하얀 입김 나누던 그 겨울'
};

const DEFAULT_PLACE: Record<Occasion, string> = {
  birthday: '우리 동네',
  parents: '우리 집 앞',
  wedding: '그곳'
};

const HANGUL_START = 0xac00;
const HANGUL_COUNT = 11172;

// Null when the word doesn't end in a Hangul syllable (a Latin name, say), so no particle fits.
export function hasFinalConsonant(word: string): boolean | null {
  const code = word.charCodeAt(word.length - 1) - HANGUL_START;
  return code >= 0 && code < HANGUL_COUNT ? code % 28 !== 0 : null;
}

// 지민아 / 수아야: the vocative particle depends on the final consonant.
const vocative = (name: string) => {
  const final = hasFinalConsonant(name);
  return final === null ? name : `${name}${final ? '아' : '야'}`;
};

// 지민과 / 수아와
export const withAnd = (word: string) => `${word}${hasFinalConsonant(word) ? '과' : '와'}`;

// Keeps what someone could reasonably type as a name or place: letters, digits and spaces.
const clean = (text: string, max: number) =>
  text
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();

// People often type the particle too (한강에서), and the template adds its own.
const cleanPlace = (place: string) => clean(place, MAX_PLACE).replace(/\s*에서$/, '');

const PARENT_WORD: Record<Parent, string> = { mom: '엄마', dad: '아빠', both: '엄마 아빠' };

type Filled = { title: string; sections: { tag: string; lines: string[] }[] };

function birthday(name: string, place: string, season: Season): Filled {
  const call = name ? vocative(name) : '친구야';
  const chorus = [`${call} 생일 축하해`, '오늘은 온통 너의 날이야', '촛불 위에 소원을 빌어', '다 이루어지길 바랄게'];
  return {
    title: name ? `${name}의 날` : '너의 날',
    sections: [
      { tag: 'Verse 1', lines: [`${place}에서 함께 웃던 날`, SEASON_LINE[season], '그날의 너를 아직 기억해', '늘 곁에 있어 줘서 고마워'] },
      { tag: 'Chorus', lines: chorus },
      { tag: 'Verse 2', lines: ['한 살 더 먹어도 변하지 마', '지금처럼 크게 웃어 줘', '힘든 날엔 내가 있을게', '언제든 나를 불러 줘'] },
      { tag: 'Chorus', lines: chorus },
      { tag: 'Outro', lines: [`${call} 태어나 줘서 고마워`] }
    ]
  };
}

function parents(parent: Parent, place: string, season: Season): Filled {
  const word = PARENT_WORD[parent];
  const chorus = [`${word} 고마워요`, '말로 다 못 한 마음을 담아', '오늘은 내가 노래할게요', `사랑해요 나의 ${word}`];
  return {
    title: `고마워요 ${word}`,
    sections: [
      { tag: 'Verse 1', lines: [`${place}에서 내 손 잡아 주던`, '그 따뜻한 손을 기억해요', SEASON_LINE[season], '그때처럼 웃어 주세요'] },
      { tag: 'Chorus', lines: chorus },
      { tag: 'Verse 2', lines: ['바쁘다는 핑계로 늦은 전화', '서운한 날도 많았죠', '이제는 내가 곁에 있을게요', '천천히 함께 걸어요'] },
      { tag: 'Chorus', lines: chorus },
      { tag: 'Outro', lines: [`${word} 오래오래 함께해요`] }
    ]
  };
}

function wedding(name: string, partner: string, place: string, season: Season): Filled {
  const pair = name && partner ? `${withAnd(name)} ${partner}` : '두 사람';
  const chorus = [`${pair} 오늘부터`, '같은 길을 함께 걸어요', '기쁜 날도 힘든 날도', '서로의 손을 놓지 마요'];
  return {
    title: '같은 길',
    sections: [
      { tag: 'Verse 1', lines: [`${place}에서 처음 만난 두 사람`, SEASON_LINE[season], '수줍던 그 첫인사가', '오늘 이 약속이 됐네요'] },
      { tag: 'Chorus', lines: chorus },
      { tag: 'Verse 2', lines: ['작은 다툼은 금방 웃음으로', '서툰 날은 사랑으로', '지금 이 마음 그대로', '오래오래 행복하세요'] },
      { tag: 'Chorus', lines: chorus },
      { tag: 'Outro', lines: [`${pair} 결혼 축하해요`] }
    ]
  };
}

const STYLE: Record<Occasion, Record<Mood, string>> = {
  birthday: {
    bright: 'upbeat acoustic pop, handclaps, cheerful and warm, 110 bpm',
    calm: 'gentle acoustic ballad, piano and guitar, warm, 80 bpm'
  },
  parents: {
    bright: 'warm folk pop, acoustic guitar, hopeful and sincere, 95 bpm',
    calm: 'emotional piano ballad, soft strings, sincere, 72 bpm'
  },
  wedding: {
    bright: 'romantic pop, acoustic guitar and bells, joyful, 100 bpm',
    calm: 'romantic piano ballad, soft strings, tender, 70 bpm'
  }
};

export function makeLyrics(input: MakerInput) {
  const name = clean(input.name, MAX_NAME);
  const partner = clean(input.partner, MAX_NAME);
  const place = cleanPlace(input.place) || DEFAULT_PLACE[input.occasion];
  const filled =
    input.occasion === 'birthday'
      ? birthday(name, place, input.season)
      : input.occasion === 'parents'
        ? parents(input.parent, place, input.season)
        : wedding(name, partner, place, input.season);
  const lyrics = filled.sections.map(section => `[${section.tag}]\n${section.lines.join('\n')}`).join('\n\n');
  const style = `${STYLE[input.occasion][input.mood]}, Korean ${input.vocal} vocal`;
  return { title: filled.title, lyrics, style };
}

// Starting message for the trial chat, so Dayeon writes an original song with the same details.
export function makerPrompt(input: MakerInput) {
  const name = clean(input.name, MAX_NAME);
  const partner = clean(input.partner, MAX_NAME);
  const place = cleanPlace(input.place);
  const season = SEASONS.find(item => item.id === input.season)?.label ?? '';
  const details = [place ? `기억나는 곳은 ${place}` : '', `계절은 ${season}`].filter(Boolean).join(', ');
  const who =
    input.occasion === 'birthday'
      ? `${name ? `${name}의 ` : ''}생일 축하 노래`
      : input.occasion === 'parents'
        ? `${PARENT_WORD[input.parent]}께 드리는 감사 노래`
        : `${name && partner ? `${withAnd(name)} ${partner}의 ` : ''}결혼식 축가`;
  return `${who} 가사를 새로 써 줘. ${details}이야. 우리만의 이야기가 더 들어가게 나한테 질문해 줘.`;
}
