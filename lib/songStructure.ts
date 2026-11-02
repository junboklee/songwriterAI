// Song-structure builder for /lyrics/structure: arranges sections, numbers the section tags the way
// Suno and similar tools read them ([Verse 1], [Chorus], ...), and joins the user's lines under them.
// Tags match the ones lib/songwritingPrompt asks the model for. Runs in the browser, no AI call.

export type SectionKind = 'intro' | 'verse' | 'preChorus' | 'chorus' | 'bridge' | 'instrumental' | 'outro';

export type SectionInfo = {
  tag: string;
  name: string;
  // Typical number of lines; 0 means the section is usually played without lyrics.
  lines: number;
  hint: string;
  // Later sections of these kinds usually repeat the first one's lyrics.
  repeats?: boolean;
  noLyrics?: boolean;
};

export const SECTION_KINDS: SectionKind[] = ['intro', 'verse', 'preChorus', 'chorus', 'bridge', 'instrumental', 'outro'];

export const SECTION_INFO: Record<SectionKind, SectionInfo> = {
  intro: { tag: 'Intro', name: '인트로', lines: 0, hint: '반주로 시작해요. 비워 두면 연주만 나와요.' },
  verse: { tag: 'Verse', name: '벌스', lines: 4, hint: '장면과 이야기를 풀어 놓는 부분이에요.' },
  preChorus: { tag: 'Pre-Chorus', name: '프리코러스', lines: 2, hint: '후렴으로 올라가며 기대를 쌓아요.', repeats: true },
  chorus: { tag: 'Chorus', name: '후렴', lines: 4, hint: '제목과 가장 하고 싶은 말이 들어가요.', repeats: true },
  bridge: { tag: 'Bridge', name: '브릿지', lines: 2, hint: '한 번만 나오며 분위기를 바꿔요.' },
  instrumental: { tag: 'Instrumental', name: '간주', lines: 0, hint: '가사 없이 연주만 나와요.', noLyrics: true },
  outro: { tag: 'Outro', name: '아웃트로', lines: 2, hint: '후렴 한 줄이나 여운으로 끝내요.' }
};

export const MAX_SECTIONS = 16;
export const MAX_SECTION_TEXT = 600;
export const MAX_LINES = 16;

export type StructureSection = {
  id: string;
  kind: SectionKind;
  lines: number;
  text: string;
  // Sing the first section of the same kind again instead of this section's own text.
  repeat: boolean;
};

export type StructurePreset = {
  name: string;
  topic: string;
  sections: Array<SectionKind | [SectionKind, number]>;
};

export const STRUCTURE_PRESETS: StructurePreset[] = [
  {
    name: '케이팝·팝 (3분)',
    topic: 'how-to-write-lyrics',
    sections: ['intro', 'verse', 'preChorus', 'chorus', 'verse', 'preChorus', 'chorus', 'bridge', 'chorus', 'outro']
  },
  { name: '발라드', topic: 'breakup-song', sections: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'] },
  { name: '축가', topic: 'wedding-song', sections: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'outro'] },
  { name: '생일 노래 (1분)', topic: 'birthday-song', sections: ['intro', 'verse', 'chorus', 'outro'] },
  { name: '트로트', topic: 'trot-lyrics', sections: ['intro', 'verse', 'chorus', 'instrumental', 'verse', 'chorus', 'outro'] },
  { name: '랩·힙합', topic: 'rap-lyrics', sections: ['intro', ['verse', 8], 'chorus', ['verse', 8], 'chorus', 'outro'] },
  { name: '동요', topic: 'kids-song', sections: ['verse', 'chorus', 'verse', 'chorus'] },
  { name: 'CM송 (30초)', topic: 'jingle-song', sections: [['verse', 2], ['chorus', 2]] }
];

let lastId = 0;
const newId = () => `section-${++lastId}`;

export const canRepeat = (sections: StructureSection[], index: number) => {
  const kind = sections[index]?.kind;
  return Boolean(kind && SECTION_INFO[kind].repeats && sections.slice(0, index).some(item => item.kind === kind));
};

export function createSection(kind: SectionKind, sections: StructureSection[] = [], lines?: number): StructureSection {
  const info = SECTION_INFO[kind];
  return {
    id: newId(),
    kind,
    lines: lines ?? info.lines,
    text: '',
    repeat: Boolean(info.repeats && sections.some(item => item.kind === kind))
  };
}

// Swaps in a preset's layout but keeps what the user already wrote: the n-th verse keeps the text of
// the previous n-th verse, and so on.
export function applyPreset(preset: StructurePreset, current: StructureSection[] = []): StructureSection[] {
  const written = new Map<SectionKind, string[]>();
  current.forEach(item => {
    if (!item.repeat) {
      written.set(item.kind, [...(written.get(item.kind) ?? []), item.text]);
    }
  });
  const next: StructureSection[] = [];
  preset.sections.forEach(entry => {
    const [kind, lines] = Array.isArray(entry) ? entry : [entry, undefined];
    const section = createSection(kind, next, lines);
    if (!section.repeat) {
      section.text = written.get(kind)?.shift() ?? '';
    }
    next.push(section);
  });
  return next;
}

export function moveSection(sections: StructureSection[], index: number, step: -1 | 1): StructureSection[] {
  const target = index + step;
  if (index < 0 || target < 0 || target >= sections.length) {
    return sections;
  }
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return normalizeRepeats(next);
}

export const removeSection = (sections: StructureSection[], index: number) =>
  normalizeRepeats(sections.filter((_, i) => i !== index));

// The first section of a kind has nothing to repeat, so moving or deleting can't leave it pointing nowhere.
function normalizeRepeats(sections: StructureSection[]) {
  return sections.map((item, index) => (item.repeat && !canRepeat(sections, index) ? { ...item, repeat: false } : item));
}

// [Verse 1], [Verse 2] when a kind appears more than once without repeating; repeated choruses stay [Chorus].
export function sectionLabels(sections: StructureSection[]): string[] {
  const totals = new Map<SectionKind, number>();
  sections.forEach(item => {
    if (!item.repeat) {
      totals.set(item.kind, (totals.get(item.kind) ?? 0) + 1);
    }
  });
  const seen = new Map<SectionKind, number>();
  return sections.map(item => {
    const { tag } = SECTION_INFO[item.kind];
    if (item.repeat || (totals.get(item.kind) ?? 0) < 2) {
      return tag;
    }
    const nth = (seen.get(item.kind) ?? 0) + 1;
    seen.set(item.kind, nth);
    return `${tag} ${nth}`;
  });
}

const cleanText = (text: string) =>
  text
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
    .replace(/\n{2,}/g, '\n');

export function sectionText(sections: StructureSection[], index: number): string {
  const section = sections[index];
  if (!section || SECTION_INFO[section.kind].noLyrics) {
    return '';
  }
  if (section.repeat) {
    const source = sections.slice(0, index).find(item => item.kind === section.kind && !item.repeat);
    return source ? cleanText(source.text) : '';
  }
  return cleanText(section.text);
}

export function buildStructuredLyrics(sections: StructureSection[]): string {
  const labels = sectionLabels(sections);
  return sections
    .map((_, index) => {
      const text = sectionText(sections, index);
      return text ? `[${labels[index]}]\n${text}` : `[${labels[index]}]`;
    })
    .join('\n\n');
}

// One-line outline for the songwriting chat, e.g. "Intro → Verse 1 (4줄) → Chorus (4줄) → Chorus (반복)".
export function structureSummary(sections: StructureSection[]): string {
  const labels = sectionLabels(sections);
  return sections
    .map((item, index) => {
      if (item.repeat) {
        return `${labels[index]} (반복)`;
      }
      return item.lines > 0 && !SECTION_INFO[item.kind].noLyrics ? `${labels[index]} (${item.lines}줄)` : labels[index];
    })
    .join(' → ');
}

export const hasWrittenText = (sections: StructureSection[]) => sections.some(item => item.text.trim());
