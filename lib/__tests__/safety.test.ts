import { looksLikeCrisis } from '@/lib/safety';

describe('looksLikeCrisis', () => {
  it.each([
    '요즘 그냥 죽고 싶어',
    '사라지고 싶다는 생각만 들어',
    '다 끝내고 싶어',
    '이번 생은 끝내고 싶다',
    '살고 싶지 않아',
    '살기 싫어 진짜',
    '자해를 했어',
    '자살 생각이 나',
    'I want to die',
    'thinking about suicide'
  ])('flags "%s"', message => {
    expect(looksLikeCrisis(message)).toBe(true);
  });

  it.each([
    '죽을 만큼 사랑해 같은 가사 써줘',
    '이별 노래 써줘',
    '사라지는 별빛 같은 노래',
    '오늘 하루 끝내고 맥주 한잔',
    '시험 끝나고 여행 가는 노래'
  ])('does not flag "%s"', message => {
    expect(looksLikeCrisis(message)).toBe(false);
  });
});
