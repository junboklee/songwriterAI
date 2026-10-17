import { useState } from 'react';

import { CHARACTER_LIMITS } from '@/lib/characterFields';

export const CATEGORY_SUGGESTIONS = [
  'Helpers',
  'Game Characters',
  'Games',
  'Anime',
  'VTuber',
  'Books',
  'Movies & TV',
  'Animals',
  'Philosophy',
  'Politics'
];

type CategoryPickerProps = {
  inputId: string;
  label: string;
  placeholder: string;
  removeLabel: string;
  value: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
};

// Selected category tags, a free-text input (Enter adds) and quick suggestion chips.
// Shared by the character create page and the edit panel.
export function CategoryPicker({ inputId, label, placeholder, removeLabel, value, onChange, disabled }: CategoryPickerProps) {
  const [draft, setDraft] = useState('');
  const isFull = value.length >= CHARACTER_LIMITS.categoryCount;

  const add = (category: string) => {
    const trimmed = category.trim().slice(0, CHARACTER_LIMITS.categoryLength);
    if (trimmed && !isFull && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
  };

  return (
    <div className="cai-form-section cai-form-section--left">
      <label htmlFor={inputId}>
        {label} ({value.length}/{CHARACTER_LIMITS.categoryCount})
      </label>
      <div className="cai-selected-tags">
        {value.map(category => (
          <div key={category} className="cai-selected-tag">
            {category}
            <button
              type="button"
              aria-label={removeLabel}
              onClick={() => onChange(value.filter(item => item !== category))}
              disabled={disabled}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <input
        id={inputId}
        type="text"
        value={draft}
        maxLength={CHARACTER_LIMITS.categoryLength}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          // Ignore the Enter that finishes Korean (IME) composition; it would add a half-typed tag.
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            add(draft);
            setDraft('');
          }
        }}
        placeholder={placeholder}
        disabled={disabled || isFull}
      />
      <div className="cai-category-tags">
        {CATEGORY_SUGGESTIONS.map(option => (
          <button
            key={option}
            type="button"
            className={`cai-category-tag ${value.includes(option) ? 'active' : ''}`}
            onClick={() => add(option)}
            disabled={disabled || (isFull && !value.includes(option))}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
