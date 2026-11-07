// Fill-in lyrics for the free maker page (/lyrics/maker): our own templates, written for this
// site, filled with a name, a place and a season in the browser. No AI call, so it keeps working
// while the AI can't answer.

import { hasFinalConsonant } from '@/lib/hangul';

export type Occasion = 'birthday' | 'parents' | 'wedding' | 'love' | 'friend' | 'graduation' | 'cheer';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Mood = 'bright' | 'calm';
export type Vocal = 'female' | 'male';
export type Parent = 'mom' | 'dad' | 'both';

export type MakerInput = {
  occasion: Occasion;
  // The person the song is for; for a wedding, the groom (partner is the bride).
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

// What the form asks for each occasion. Parents pick 엄마/아빠 instead of typing a name.
export type OccasionFields = {
  nameLabel: string | null;
  partnerLabel?: string;
  placeLabel: string;
  placeExample: string;
};

export const OCCASIONS: ({ id: Occasion; label: string } & OccasionFields)[] = [
  { id: 'birthday', label: '생일 축하', nameLabel: '받는 사람 이름', placeLabel: '함께한 추억의 장소', placeExample: '한강' },
  { id: 'parents', label: '부모님께 감사', nameLabel: null, placeLabel: '함께한 추억의 장소', placeExample: '한강' },
  {
    id: 'wedding',
    label: '결혼 축가',
    nameLabel: '신랑 이름',
    partnerLabel: '신부 이름',
    placeLabel: '두 사람이 처음 만난 곳',
    placeExample: '대학교 도서관'
  },
  { id: 'love', label: '사랑 고백', nameLabel: '좋아하는 사람 이름', placeLabel: '처음 만난 곳', placeExample: '동아리방' },
  { id: 'friend', label: '친구에게', nameLabel: '친구 이름', placeLabel: '함께 놀던 곳', placeExample: '학교 앞 분식집' },
  { id: 'graduation', label: '졸업 축하', nameLabel: '졸업하는 사람 이름', placeLabel: '함께 지낸 곳', placeExample: '우리 교실' },
  { id: 'cheer', label: '힘내라는 응원', nameLabel: '응원할 사람 이름', placeLabel: '함께한 추억의 장소', placeExample: '한강' }
];

export const occasionFields = (occasion: Occasion): OccasionFields =>
  OCCASIONS.find(item => item.id === occasion) ?? OCCASIONS[0];

// Topic pages whose song the maker can fill in, so they can open it with that occasion picked.
const OCCASION_BY_TOPIC: Record<string, Occasion> = {
  'birthday-song': 'birthday',
  'parents-song': 'parents',
  'parents-day-song': 'parents',
  'parents-birthday-party-song': 'parents',
  'wedding-song': 'wedding',
  'confession-song': 'love',
  'crush-song': 'love',
  'friendship-song': 'friend',
  'graduation-song': 'graduation',
  'exam-cheer-song': 'cheer',
  'comfort-song': 'cheer'
};

export const makerHrefForTopic = (slug: string) =>
  OCCASION_BY_TOPIC[slug] ? `/lyrics/maker?for=${OCCASION_BY_TOPIC[slug]}` : null;

export const parseOccasion = (value: string | null): Occasion | null =>
  OCCASIONS.find(item => item.id === value)?.id ?? null;

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
  wedding: '그곳',
  love: '그곳',
  friend: '우리 동네',
  graduation: '그 교실',
  cheer: '우리 동네'
};

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

// Verse 1, Chorus, Verse 2, Chorus, Outro: the shape every template shares.
const song = (title: string, verse1: string[], chorus: string[], verse2: string[], outro: string): Filled => ({
  title,
  sections: [
    { tag: 'Verse 1', lines: verse1 },
    { tag: 'Chorus', lines: chorus },
    { tag: 'Verse 2', lines: verse2 },
    { tag: 'Chorus', lines: chorus },
    { tag: 'Outro', lines: [outro] }
  ]
});

type Details = { name: string; partner: string; parent: Parent; place: string; season: Season };

const TEMPLATES: Record<Occasion, (details: Details) => Filled> = {
  birthday: ({ name, place, season }) => {
    const call = name ? vocative(name) : '친구야';
    return song(
      name ? `${name}의 날` : '너의 날',
      [`${place}에서 함께 웃던 날`, SEASON_LINE[season], '그날의 너를 아직 기억해', '늘 곁에 있어 줘서 고마워'],
      [`${call} 생일 축하해`, '오늘은 온통 너의 날이야', '촛불 위에 소원을 빌어', '다 이루어지길 바랄게'],
      ['한 살 더 먹어도 변하지 마', '지금처럼 크게 웃어 줘', '힘든 날엔 내가 있을게', '언제든 나를 불러 줘'],
      `${call} 태어나 줘서 고마워`
    );
  },
  parents: ({ parent, place, season }) => {
    const word = PARENT_WORD[parent];
    return song(
      `고마워요 ${word}`,
      [`${place}에서 내 손 잡아 주던`, '그 따뜻한 손을 기억해요', SEASON_LINE[season], '그때처럼 웃어 주세요'],
      [`${word} 고마워요`, '말로 다 못 한 마음을 담아', '오늘은 내가 노래할게요', `사랑해요 나의 ${word}`],
      ['바쁘다는 핑계로 늦은 전화', '서운한 날도 많았죠', '이제는 내가 곁에 있을게요', '천천히 함께 걸어요'],
      `${word} 오래오래 함께해요`
    );
  },
  wedding: ({ name, partner, place, season }) => {
    const pair = name && partner ? `${withAnd(name)} ${partner}` : '두 사람';
    return song(
      '같은 길',
      [`${place}에서 처음 만난 두 사람`, SEASON_LINE[season], '수줍던 그 첫인사가', '오늘 이 약속이 됐네요'],
      [`${pair} 오늘부터`, '같은 길을 함께 걸어요', '기쁜 날도 힘든 날도', '서로의 손을 놓지 마요'],
      ['작은 다툼은 금방 웃음으로', '서툰 날은 사랑으로', '지금 이 마음 그대로', '오래오래 행복하세요'],
      `${pair} 결혼 축하해요`
    );
  },
  love: ({ name, place, season }) => {
    const call = name ? vocative(name) : '있잖아';
    return song(
      name ? `${name}에게` : '너에게',
      [`${place}에서 처음 본 순간`, SEASON_LINE[season], '그날부터 내 하루는', '온통 너로 가득했어'],
      [`${call} 너를 좋아해`, '말하지 못한 이 마음', '오늘은 꼭 전하고 싶어', '내 곁에 있어 줄래'],
      ['아무렇지 않은 척했지만', '네 웃음에 늘 설렜어', '서툰 나라도 괜찮다면', '천천히 다가갈게'],
      `${call} 사랑해`
    );
  },
  friend: ({ name, place, season }) => {
    const call = name ? vocative(name) : '오랜 친구야';
    return song(
      name ? `오랜 친구 ${name}` : '오랜 친구',
      [`${place}에서 떠들던 밤`, SEASON_LINE[season], '별것 아닌 이야기에도', '배가 아프게 웃었지'],
      [`${call} 늘 고마워`, '멀리 있어도 괜찮아', '우리 웃음은 그대로야', '언제든 달려갈게'],
      ['서로 바빠 연락 뜸해도', '어제 본 것처럼 반가워', '힘든 날 말없이 곁에', '있어 줘서 고마웠어'],
      `${call} 오래오래 함께하자`
    );
  },
  graduation: ({ name, place, season }) => {
    const call = name ? vocative(name) : '우리 모두';
    return song(
      name ? `${name}의 졸업식` : '졸업하는 날',
      [`${place}에서 보낸 날들`, SEASON_LINE[season], '서툴던 첫날의 우리가', '어느새 여기까지 왔네'],
      [`${call} 졸업 축하해`, '새로운 길 앞에 서도', '오늘의 웃음 잊지 마', '어디서든 빛날 거야'],
      ['함께 웃고 함께 울던', '그 시간이 우릴 키웠어', '이제는 각자의 꿈을 향해', '힘차게 걸어갈 시간'],
      `${call} 수고 많았어`
    );
  },
  cheer: ({ name, place, season }) => {
    const call = name ? vocative(name) : '친구야';
    return song(
      name ? `${call} 힘내` : '오늘도 힘내',
      [`${place}에서 마주 앉아`, SEASON_LINE[season], '네가 꾸던 꿈 이야기를', '반짝이며 들려줬었지'],
      [`${call} 조금만 힘내`, '넘어져도 괜찮아', '천천히 가도 괜찮아', '내가 여기 있을게'],
      ['잠 못 드는 밤이 와도', '너무 혼자 애쓰지 마', '지금까지 걸어온 길', '네 노력은 내가 다 알아'],
      `${call} 넌 잘하고 있어`
    );
  }
};

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
  },
  love: {
    bright: 'sweet acoustic pop, ukulele and soft drums, fluttering, 105 bpm',
    calm: 'tender acoustic ballad, piano and soft strings, heartfelt, 75 bpm'
  },
  friend: {
    bright: 'upbeat indie pop, acoustic guitar and claps, nostalgic, 115 bpm',
    calm: 'warm acoustic folk, gentle guitar, nostalgic, 85 bpm'
  },
  graduation: {
    bright: 'hopeful pop rock, piano and drums, uplifting, 120 bpm',
    calm: 'nostalgic piano ballad, soft strings, bittersweet, 76 bpm'
  },
  cheer: {
    bright: 'uplifting pop, bright guitar and drums, energetic, 118 bpm',
    calm: 'comforting acoustic ballad, piano, warm and gentle, 78 bpm'
  }
};

export function makeLyrics(input: MakerInput) {
  const filled = TEMPLATES[input.occasion]({
    name: clean(input.name, MAX_NAME),
    partner: clean(input.partner, MAX_NAME),
    parent: input.parent,
    place: cleanPlace(input.place) || DEFAULT_PLACE[input.occasion],
    season: input.season
  });
  const lyrics = filled.sections.map(section => `[${section.tag}]\n${section.lines.join('\n')}`).join('\n\n');
  const style = `${STYLE[input.occasion][input.mood]}, Korean ${input.vocal} vocal`;
  return { title: filled.title, lyrics, style };
}

// What the trial chat is asked to write, per occasion.
const PROMPT_SUBJECT: Record<Occasion, (name: string, partner: string, parent: Parent) => string> = {
  birthday: name => `${name ? `${name}의 ` : ''}생일 축하 노래`,
  parents: (_name, _partner, parent) => `${PARENT_WORD[parent]}께 드리는 감사 노래`,
  wedding: (name, partner) => `${name && partner ? `${withAnd(name)} ${partner}의 ` : ''}결혼식 축가`,
  love: name => `${name ? `${name}에게 ` : ''}고백하는 노래`,
  friend: name => `${name ? `친구 ${name}에게 주는` : '친구에게 주는'} 우정 노래`,
  graduation: name => `${name ? `${name}의 ` : ''}졸업 축하 노래`,
  cheer: name => `${name ? `${name}에게 보내는 ` : ''}응원 노래`
};

// Starting message for the trial chat, so Dayeon writes an original song with the same details.
export function makerPrompt(input: MakerInput) {
  const name = clean(input.name, MAX_NAME);
  const partner = clean(input.partner, MAX_NAME);
  const place = cleanPlace(input.place);
  const season = SEASONS.find(item => item.id === input.season)?.label ?? '';
  const details = [place ? `기억나는 곳은 ${place}` : '', `계절은 ${season}`].filter(Boolean).join(', ');
  const who = PROMPT_SUBJECT[input.occasion](name, partner, input.parent);
  return `${who} 가사를 새로 써 줘. ${details}이야. 우리만의 이야기가 더 들어가게 나한테 질문해 줘.`;
}
