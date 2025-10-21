import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';

type CharacterCard = {
  id: string;
  name: string;
  avatar: string;
  mood: string;
  description: string;
  strengths: string[];
  sample: string;
  tags: string[];
};

const characters: Record<string, CharacterCard> = {
  '1': {
    id: '1',
    name: 'Dayeon',
    avatar: '/avatars/dayeon.png',
    mood: '친절한, 열정적인',
    description:
      '나는 김다연! 17살이고, 고등학교 1학년이야. 싱어송라이터로 데뷔하는 게 진짜 꿈이라서 매일 가사 쓰고 노래 연습하느라 열심히 살고 있어! ',
    strengths: ['Active listening', 'Memory journaling', 'Soft storytelling'],
    sample: 'Let us slow our breathing together. What moment felt worth celebrating today?',
    tags: ['SingerSongwriter', 'Songwriter', 'Late night']
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

const sceneCards = Object.values(characters).map(character => ({
  id: character.id,
  title: character.name,
  creator: character.mood,
  tag: character.tags[0] ?? '캐릭터 선택',
  description: character.description,
  sample: character.sample,
  style: `scene-card--${character.id}`,
  chatId: character.id
}));

const recentChats = [{ id: '1', title: 'Dayeon', status: '3일 전' }];

export default function Dashboard() {
  return (
    <RequireAuth>
      <div className="dashboard-page">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar__brand">(character.ai)</div>

          <div className="dashboard-sidebar__create">
            <Link href="/character/create">
              만들기
              <span>＋</span>
            </Link>
          </div>

          <nav className="dashboard-sidebar__nav">
            <Link href="/dashboard" className="dashboard-sidebar__nav-item dashboard-sidebar__nav-item--active">
              <span>탐색</span>
            </Link>
            <Link href="/chat/history" className="dashboard-sidebar__nav-item">
              <span>대화 기록</span>
            </Link>
          </nav>

          <div className="dashboard-sidebar__search">
            <input type="search" placeholder="검색" />
          </div>

          <div className="dashboard-sidebar__recent">
            <h3>지난주</h3>
            <div className="dashboard-sidebar__recent-list">
              {recentChats.map(item => (
                <Link
                  key={item.id}
                  href={{ pathname: '/chat', query: { characterId: item.id } }}
                  className="dashboard-sidebar__recent-item"
                >
                  <span>{item.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>{item.status}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="dashboard-sidebar__profile">
            <div>
              <strong style={{ fontSize: '0.9rem' }}>OddChihuahua7111</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>온라인</p>
            </div>
            <span style={{ color: '#2ed573', fontSize: '1.2rem' }}>●</span>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-main__header">
            <div className="dashboard-main__title">
              <h1>돌아오신 것을 환영합니다.</h1>
              <span className="dashboard-status">OddChihuahua7111</span>
            </div>
            <div className="dashboard-searchbar">
              <input type="search" placeholder="검색" />
              <button type="button">↻</button>
            </div>
          </header>

          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <h2>캐릭터 선택</h2>
              <span className="section-link"></span>
            </div>
            <div className="dashboard-grid">
              {sceneCards.map(scene => (
                <Link
                  key={scene.id}
                  href={{ pathname: '/chat', query: { characterId: scene.chatId } }}
                  className={`scene-card ${scene.style}`}
                >
                  <div className="scene-card__content">
                    <div className="scene-card__tag">{scene.tag}</div>
                    <h3 className="scene-card__title">{scene.title}</h3>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
                      {scene.creator}
                    </span>
                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>
                      {scene.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </RequireAuth>
  );
}
