import { useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { AppNav } from '@/components/AppNav';
import { RequireAuth } from '@/components/RequireAuth';

const characters = {
  '1': {
    id: '1',
    name: 'Dayeon',
    avatar: '/avatars/dayeon.png',
    mood: 'Empathy',
    description:
      'A gentle companion who keeps track of your day, encourages reflection, and remembers small wins.',
    strengths: ['Active listening', 'Memory journaling', 'Soft storytelling'],
    sample: 'Let us slow our breathing together. What moment felt worth celebrating today?',
    tags: ['Wellness', 'Daily check-in', 'Late night']
  },
  '2': {
    id: '2',
    name: 'Junho',
    avatar: '/avatars/junho.png',
    mood: 'Healing',
    description:
      'Mindfulness mentor with calming language and practical routines to reset your energy.',
    strengths: ['Guided grounding', 'Focus rituals', 'Morning planning'],
    sample: 'How about we begin with a five-minute stretch and list one intention for the day?',
    tags: ['Mindful', 'Morning', 'Productivity']
  },
  '3': {
    id: '3',
    name: 'Jimin',
    avatar: '/avatars/jimin.png',
    mood: 'Romance',
    description:
      'Playful muse who co-writes romantic encounters and sparks creative roleplay ideas.',
    strengths: ['Creative prompts', 'Roleplay arcs', 'Playful banter'],
    sample:
      'Picture the city lights reflected in the river as we wander. Shall we write the next scene together?',
    tags: ['Romance', 'Storytelling', 'Adventure']
  }
};

export default function CharacterDetail() {
  const router = useRouter();
  const characterId = useMemo(() => {
    const raw = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    return raw ?? '1';
  }, [router.query.id]);

  const character = characters[characterId as keyof typeof characters] ?? characters['1'];

  return (
    <RequireAuth>
      <AppShell
        sidebar={
          <div className="glass-panel" style={{ padding: 24, display: 'grid', gap: 18 }}>
            <div>
              <p className="section-title">Quick stats</p>
              <div className="chip-list" style={{ marginTop: 14 }}>
                {character.tags.map(tag => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="section-title">Strengths</p>
              <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: 'var(--text-secondary)' }}>
                {character.strengths.map(item => (
                  <li key={item} style={{ marginBottom: 6, fontSize: '0.9rem' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="callout">
              Tip: Link this character with a dedicated OpenAI Assistant ID to ensure consistent
              responses and memories across every chat.
            </div>
          </div>
        }
      >
        <AppNav
          actions={
            <>
              <Link href="/dashboard" className="btn btn--ghost">
                Back to discover
              </Link>
              <Link href={{ pathname: '/chat', query: { characterId: character.id } }} className="btn btn--primary">
                Chat now
              </Link>
            </>
          }
        />

        <section className="glass-panel" style={{ padding: 32, display: 'grid', gap: 28 }}>
          <header style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Image
              src={character.avatar}
              alt={`${character.name} avatar`}
              width={92}
              height={92}
              style={{ borderRadius: 28 }}
            />
            <div>
              <div className="pill">{character.mood}</div>
              <h1 style={{ margin: '12px 0 8px', fontSize: '2rem' }}>{character.name}</h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6 }}>
                {character.description}
              </p>
            </div>
          </header>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Sample reply</h2>
            <p
              style={{
                margin: '10px 0 0',
                padding: '16px 18px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                lineHeight: 1.6
              }}
            >
              {character.sample}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href={{ pathname: '/chat', query: { characterId: character.id } }}
              className="btn btn--primary"
              style={{ paddingInline: 26 }}
            >
              Start chatting
            </Link>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => alert('Bookmark feature should integrate with your backend.')}
            >
              Bookmark character
            </button>
          </div>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
