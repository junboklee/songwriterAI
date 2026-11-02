import {
  applyPreset,
  buildStructuredLyrics,
  createSection,
  loadStructureDraft,
  moveSection,
  removeSection,
  saveStructureDraft,
  sectionLabels,
  STRUCTURE_PRESETS,
  structureSummary,
  type StructureSection
} from '@/lib/songStructure';

const preset = (name: string) => {
  const found = STRUCTURE_PRESETS.find(item => item.name === name);
  if (!found) {
    throw new Error(name);
  }
  return found;
};

const withText = (sections: StructureSection[], texts: Record<number, string>) =>
  sections.map((item, index) => (texts[index] !== undefined ? { ...item, text: texts[index] } : item));

describe('song structure', () => {
  it('numbers verses and keeps repeated choruses as one [Chorus]', () => {
    const sections = applyPreset(preset('발라드'));
    expect(sectionLabels(sections)).toEqual([
      'Intro',
      'Verse 1',
      'Chorus',
      'Verse 2',
      'Chorus',
      'Bridge',
      'Chorus',
      'Outro'
    ]);
    expect(sections.filter(item => item.kind === 'chorus').map(item => item.repeat)).toEqual([false, true, true]);
  });

  it('copies the first chorus into repeats and cleans up spacing', () => {
    const sections = withText(applyPreset(preset('생일 노래 (1분)')), { 1: '  촛불 하나 \n\n\n소원 하나  ', 2: '생일 축하해\n' });
    const lyrics = buildStructuredLyrics([...sections.slice(0, 3), createSection('chorus', sections), sections[3]]);
    expect(lyrics).toBe('[Intro]\n\n[Verse]\n촛불 하나\n소원 하나\n\n[Chorus]\n생일 축하해\n\n[Chorus]\n생일 축하해\n\n[Outro]');
  });

  it('keeps written lines when switching presets', () => {
    const pop = withText(applyPreset(preset('케이팝·팝 (3분)')), { 1: '첫 벌스', 3: '후렴', 4: '둘째 벌스' });
    const ballad = applyPreset(preset('발라드'), pop);
    expect(ballad[1].text).toBe('첫 벌스');
    expect(ballad[2].text).toBe('후렴');
    expect(ballad[3].text).toBe('둘째 벌스');
  });

  it('drops a repeat flag when the section it copied is gone', () => {
    const sections = applyPreset(preset('동요'));
    const moved = moveSection(sections, 3, -1);
    expect(sectionLabels(moved)).toEqual(['Verse 1', 'Chorus', 'Chorus', 'Verse 2']);
    const removed = removeSection(sections, 1);
    expect(removed.find(item => item.kind === 'chorus')?.repeat).toBe(false);
    expect(moveSection(sections, 0, -1)).toBe(sections);
  });

  it('restores a saved draft and rejects tampered data', () => {
    window.localStorage.clear();
    const sections = withText(applyPreset(preset('동요')), { 0: '첫 벌스' });
    saveStructureDraft(sections);
    expect(loadStructureDraft()?.map(({ kind, text, repeat }) => ({ kind, text, repeat }))).toEqual(
      sections.map(({ kind, text, repeat }) => ({ kind, text, repeat }))
    );

    window.localStorage.setItem(
      'novasinger.structureDraft',
      JSON.stringify([
        { kind: 'hack', text: '버려짐', lines: 4 },
        { kind: 'chorus', text: '후렴', lines: 999, repeat: true },
        null
      ])
    );
    expect(loadStructureDraft()).toEqual([expect.objectContaining({ kind: 'chorus', text: '후렴', lines: 16, repeat: false })]);

    window.localStorage.setItem('novasinger.structureDraft', '{broken');
    expect(loadStructureDraft()).toBeNull();

    saveStructureDraft(applyPreset(preset('동요')));
    expect(window.localStorage.getItem('novasinger.structureDraft')).toBeNull();
  });

  it('summarizes the layout for the songwriting chat', () => {
    expect(structureSummary(applyPreset(preset('트로트')))).toBe(
      'Intro → Verse 1 (4줄) → Chorus (4줄) → Instrumental → Verse 2 (4줄) → Chorus (반복) → Outro (2줄)'
    );
    expect(structureSummary(applyPreset(preset('랩·힙합')))).toContain('Verse 1 (8줄)');
  });
});
