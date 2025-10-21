import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { AppNav } from '@/components/AppNav';
import { RequireAuth } from '@/components/RequireAuth';

type VisibilityOption = 'private' | 'unlisted' | 'public';

const moodPresets = [
  { label: 'Empathy coach', emoji: '💙', description: 'Warm, reflective, grounded responses.' },
  { label: 'Adventure guide', emoji: '🧭', description: 'High-energy, story-rich explorations.' },
  { label: 'Romance muse', emoji: '💌', description: 'Playful, flirty, imaginative prompts.' },
  { label: 'Productivity partner', emoji: '⚙️', description: 'Focus, accountability, planning.' }
];

const visibilityOptions: { value: VisibilityOption; label: string; description: string }[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can chat with this character.'
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Share a secret link with friends and collaborators.'
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Publish on the discovery feed for everyone to explore.'
  }
];

export default function CharacterCreate() {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [greeting, setGreeting] = useState('');
  const [instructions, setInstructions] = useState('');
  const [example, setExample] = useState('');
  const [visibility, setVisibility] = useState<VisibilityOption>('private');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      alert('Character draft saved! Connect this page to your backend to persist the data.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireAuth>
      <AppShell
        sidebar={
          <>
            <div>
              <p className="section-title">Mood presets</p>
              <div className="sidebar-list" style={{ marginTop: 14 }}>
                {moodPresets.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    className="sidebar-item"
                    onClick={() => setSelectedMood(preset.label)}
                    style={
                      selectedMood === preset.label
                        ? { borderColor: 'rgba(108, 92, 231, 0.6)' }
                        : undefined
                    }
                  >
                    <span className="sidebar-item__icon">{preset.emoji}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{preset.label}</p>
                      <p
                        style={{
                          margin: '4px 0 0',
                          color: 'var(--text-secondary)',
                          fontSize: '0.82rem'
                        }}
                      >
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="callout">
              Tip: Characters feel more alive when instructions outline personality, goals, and
              boundaries. Reference your OpenAI assistant ID in backend logic for consistent
              behaviour across sessions.
            </div>
          </>
        }
      >
        <AppNav
          actions={
            <>
              <Link href="/dashboard" className="btn btn--ghost">
                Cancel
              </Link>
              <button type="submit" form="create-character-form" className="btn btn--primary">
                {saving ? 'Saving...' : 'Save draft'}
              </button>
            </>
          }
        />

        <form id="create-character-form" onSubmit={handleSubmit} className="glass-panel" style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Design your character</h1>
              <p
                style={{
                  margin: '8px 0 0',
                  color: 'var(--text-secondary)',
                  maxWidth: 540,
                  lineHeight: 1.6
                }}
              >
                Define how your AI companion introduces itself, responds to users, and keeps track of
                memories across conversations.
              </p>
            </div>
            {selectedMood ? (
              <div className="pill">Selected preset · {selectedMood}</div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 20, marginTop: 28 }}>
            <label style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>Character name</span>
              <input
                className="search-input"
                placeholder="e.g. Dayeon, the late-night storyteller"
                value={name}
                onChange={event => setName(event.target.value)}
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>One-line summary</span>
              <input
                className="search-input"
                placeholder="Describe their vibe in one sentence."
                value={summary}
                onChange={event => setSummary(event.target.value)}
                maxLength={160}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {summary.length}/160 characters
              </span>
            </label>

            <label style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>Opening greeting</span>
              <textarea
                className="search-input"
                style={{ minHeight: 120 }}
                placeholder="How does your character welcome the user?"
                value={greeting}
                onChange={event => setGreeting(event.target.value)}
              />
            </label>

            <label style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>Core instructions</span>
              <textarea
                className="search-input"
                style={{ minHeight: 180 }}
                placeholder="Detail their personality traits, goals, and conversation boundaries."
                value={instructions}
                onChange={event => setInstructions(event.target.value)}
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>Example response</span>
              <textarea
                className="search-input"
                style={{ minHeight: 140 }}
                placeholder="Provide a sample reply that captures their tone."
                value={example}
                onChange={event => setExample(event.target.value)}
              />
            </label>
          </div>

          <div style={{ marginTop: 32 }}>
            <span style={{ fontWeight: 600 }}>Visibility</span>
            <div className="sidebar-list" style={{ marginTop: 16 }}>
              {visibilityOptions.map(option => (
                <label
                  key={option.value}
                  className="sidebar-item"
                  style={
                    visibility === option.value
                      ? { borderColor: 'rgba(108, 92, 231, 0.6)' }
                      : undefined
                  }
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={visibility === option.value}
                    onChange={() => setVisibility(option.value)}
                    style={{ marginRight: 12 }}
                  />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{option.label}</p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem'
                      }}
                    >
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error ? (
            <p style={{ marginTop: 18, fontSize: '0.82rem', color: 'var(--danger)' }}>{error}</p>
          ) : null}
        </form>
      </AppShell>
    </RequireAuth>
  );
}
