import { useState } from 'react';

import {
  BRIEF_GENRES,
  BRIEF_LANGUAGES,
  BRIEF_LENGTHS,
  BRIEF_MOODS,
  BRIEF_TEMPOS,
  EMPTY_BRIEF,
  buildBriefPrompt,
  type SongBrief
} from '@/lib/chat/brief';

type SongBriefWizardProps = {
  onSubmit: (prompt: string) => void;
  onClose: () => void;
};

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="song-brief__group">
      <span className="song-brief__label">{label}</span>
      <div className="song-brief__chips">
        {options.map(option => (
          <button
            key={option}
            type="button"
            className={`song-brief__chip${value === option ? ' is-active' : ''}`}
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? null : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// "Blank page" helper: a few choices become a structured first request in the chat input.
export function SongBriefWizard({ onSubmit, onClose }: SongBriefWizardProps) {
  const [brief, setBrief] = useState<SongBrief>(EMPTY_BRIEF);
  const update = (patch: Partial<SongBrief>) => setBrief(prev => ({ ...prev, ...patch }));
  const canSubmit = Boolean(brief.topic.trim() || brief.genre || brief.mood);

  return (
    <div className="song-brief" role="region" aria-label="곡 만들기 마법사">
      <div className="song-brief__header">
        <strong>🎼 곡 만들기</strong>
        <button type="button" className="song-brief__close" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>

      <label className="song-brief__group">
        <span className="song-brief__label">어떤 이야기를 노래로 만들까요?</span>
        <input
          className="suno-form__input"
          value={brief.topic}
          maxLength={200}
          placeholder="예: 비 오는 날 헤어진 친구가 생각났던 일"
          onChange={event => update({ topic: event.target.value })}
        />
      </label>

      <ChipGroup label="장르" options={BRIEF_GENRES} value={brief.genre} onChange={genre => update({ genre })} />
      <ChipGroup label="분위기" options={BRIEF_MOODS} value={brief.mood} onChange={mood => update({ mood })} />
      <ChipGroup label="템포" options={BRIEF_TEMPOS} value={brief.tempo} onChange={tempo => update({ tempo })} />

      <div className="song-brief__row">
        <label className="song-brief__group">
          <span className="song-brief__label">길이</span>
          <select
            className="dashboard-section__select"
            value={brief.length}
            onChange={event => update({ length: event.target.value as SongBrief['length'] })}
          >
            <option value="short">짧게 (1절 + 후렴)</option>
            <option value="full">한 곡 전체</option>
          </select>
        </label>
        <label className="song-brief__group">
          <span className="song-brief__label">언어</span>
          <select
            className="dashboard-section__select"
            value={brief.language}
            onChange={event => update({ language: event.target.value as SongBrief['language'] })}
          >
            {Object.entries(BRIEF_LANGUAGES).map(([key, label]) => (
              <option key={key} value={key}>
                {key === 'mixed' ? '한국어 + 영어 조금' : label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="song-brief__group">
        <span className="song-brief__label">꼭 넣고 싶은 단어 (선택)</span>
        <input
          className="suno-form__input"
          value={brief.keywords}
          maxLength={100}
          placeholder="예: 우산, 버스 정류장"
          onChange={event => update({ keywords: event.target.value })}
        />
      </label>

      <div className="song-brief__footer">
        <span className="song-brief__hint">
          {canSubmit ? `${BRIEF_LENGTHS[brief.length]} 요청을 입력창에 채워요.` : '주제, 장르, 분위기 중 하나는 골라 주세요.'}
        </span>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canSubmit}
          onClick={() => onSubmit(buildBriefPrompt(brief))}
        >
          요청 만들기
        </button>
      </div>
    </div>
  );
}
