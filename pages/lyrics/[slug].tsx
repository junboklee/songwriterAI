import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';

import { TopicLayout } from '@/components/TopicLayout';
import { LYRICS_TOPICS, getLyricsTopic, topicChatHref, type LyricsTopic } from '@/lib/lyricsTopics';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: LYRICS_TOPICS.map(topic => ({ params: { slug: topic.slug } })),
  fallback: false
});

export const getStaticProps: GetStaticProps<{ topic: LyricsTopic }> = async ({ params }) => {
  const topic = getLyricsTopic(String(params?.slug ?? ''));
  return topic ? { props: { topic } } : { notFound: true };
};

export default function LyricsTopicPage({ topic }: { topic: LyricsTopic }) {
  const similar = LYRICS_TOPICS.filter(item => item.group === topic.group && item.slug !== topic.slug);
  const others = LYRICS_TOPICS.filter(item => item.group !== topic.group);
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: topic.faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  };

  return (
    <TopicLayout
      title={topic.title}
      description={topic.description}
      path={`/lyrics/${topic.slug}`}
      card={topic.slug}
      jsonLd={faqJsonLd}
    >
      <article>
        <h1>{topic.heading}</h1>
        <p className="topic-lead">{topic.intro}</p>

        <div className="topic-cta">
          <Link href={topicChatHref(topic)} className="btn btn--primary">
            가입 없이 Dayeon과 바로 만들기
          </Link>
          <Link href="/auth/register" className="btn btn--ghost">
            무료로 시작하기
          </Link>
        </div>

        <h2>이렇게 만들어요</h2>
        <ol>
          {topic.steps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2>예시 가사: {topic.sample.title}</h2>
        <p className="topic-sample">{topic.sample.lyrics}</p>
        <p className="topic-lead">이 페이지를 위해 새로 쓴 예시예요. 내 이야기를 들려주면 나만의 가사가 만들어져요.</p>

        <h2>잘 쓰는 팁</h2>
        <ul>
          {topic.tips.map(tip => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>

        <p className="topic-lead">
          가사를 다 썼다면 <Link href="/lyrics/check">가창성 검사기</Link>로 줄마다 음절 수와 부르기 어려운 곳을 확인해
          보세요. Suno에 넣을 스타일은 <Link href="/lyrics/style">스타일 프롬프트 만들기</Link>에서, 줄 끝에 맞출
          단어는 <Link href="/lyrics/rhyme">라임 찾기</Link>에서 찾을 수 있어요.
        </p>

        <h2>자주 묻는 질문</h2>
        <dl>
          {topic.faq.map(item => (
            <div key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>

        <div className="topic-cta">
          <Link href={topicChatHref(topic)} className="btn btn--primary">
            가입 없이 지금 가사 만들기
          </Link>
        </div>

        <h2>비슷한 주제</h2>
        <ul>
          {similar.map(item => (
            <li key={item.slug}>
              <Link href={`/lyrics/${item.slug}`}>{item.title}</Link>
            </li>
          ))}
        </ul>

        <h2>다른 주제</h2>
        <p className="topic-links">
          {others.map(item => (
            <Link key={item.slug} href={`/lyrics/${item.slug}`}>
              {item.label}
            </Link>
          ))}
        </p>
      </article>
    </TopicLayout>
  );
}
