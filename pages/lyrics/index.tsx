import Link from 'next/link';

import { TopicLayout } from '@/components/TopicLayout';
import { TOPIC_GROUPS, topicsInGroup } from '@/lib/lyricsTopics';

export default function LyricsTopicsIndex() {
  return (
    <TopicLayout
      title="주제별 가사 만들기"
      path="/lyrics"
      card="home"
      description="생일 축하 노래, 결혼식 축가, 고백 노래, 트로트, 랩, CM송까지. 상황과 장르에 맞는 노래 가사를 AI 싱어송라이터와 함께 만들어 보세요."
    >
      <h1>어떤 노래를 만들고 싶나요?</h1>
      <p className="topic-lead">
        상황을 고르면 만드는 방법과 예시 가사, 잘 쓰는 팁을 볼 수 있어요. 마음에 들면 바로 AI 싱어송라이터 Dayeon과
        내 이야기로 가사를 만들어 보세요.
      </p>
      <p className="topic-lead">
        이미 쓴 가사가 있다면 <Link href="/lyrics/check">가사 음절 수 세기 · 가창성 검사기</Link>로 부르기 어려운 줄을
        찾아보세요. Suno에 넣을 스타일은 <Link href="/lyrics/style">Suno 스타일 프롬프트 만들기</Link>에서 골라 만들 수
        있어요.
      </p>
      {TOPIC_GROUPS.map(group => (
        <section key={group.id}>
          <h2>{group.name}</h2>
          <ul>
            {topicsInGroup(group.id).map(topic => (
              <li key={topic.slug}>
                <Link href={`/lyrics/${topic.slug}`}>
                  <strong>{topic.title}</strong>
                </Link>
                <br />
                <span className="topic-lead">{topic.description}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </TopicLayout>
  );
}
