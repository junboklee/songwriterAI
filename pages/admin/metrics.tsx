import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';

type Metrics = {
  generatedAt: string;
  members: {
    total: number;
    adultConfirmed: number;
    identityVerified: number;
    new7: number;
    new30: number;
    active7: number;
    daily: Array<{ date: string; signups: number }>;
  };
  usage: { month: string; activeUsers: number; requests: number };
  songs: { total: number; fromChat: number; fromTrial: number; other: number; audio: number };
  trial: { today: number; yesterday: number };
  interest: Record<string, number>;
};

const INTEREST_LABELS: Record<string, string> = { sing: '다연이 불러 주기', gift: '선물로 보내기' };

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <strong className="metric__value">{value}</strong>
      {note ? <span className="metric__note">{note}</span> : null}
    </div>
  );
}

// Key numbers for the operator: members, use, songs, trial and feature interest (GET /api/admin/metrics).
function MetricsView() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const response = await fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setMetrics(payload);
      } else {
        setError(response.status === 403 ? '관리자 권한이 없습니다.' : payload.error ?? '불러오지 못했습니다.');
      }
    })();
  }, [user]);

  const maxDaily = Math.max(1, ...(metrics?.members.daily.map(day => day.signups) ?? [1]));

  return (
    <main className="admin-page">
      <nav>
        <Link href="/dashboard">← 대시보드</Link> · <Link href="/admin/reports">신고 검토</Link>
      </nav>
      <h1>서비스 지표</h1>
      <p className="admin-page__hint">시험 계정은 빼고 셉니다. 페이지를 열 때마다 새로 계산합니다.</p>
      {error ? <p className="admin-page__notice admin-page__notice--error">{error}</p> : null}
      {!metrics && !error ? <p className="admin-page__notice">불러오는 중...</p> : null}

      {metrics ? (
        <>
          <h2>회원</h2>
          <div className="metric-grid">
            <Stat label="전체 회원" value={metrics.members.total} />
            <Stat label="최근 7일 가입" value={metrics.members.new7} note={`30일 ${metrics.members.new30}명`} />
            <Stat label="최근 7일 접속" value={metrics.members.active7} />
            <Stat label="만 19세 확인" value={metrics.members.adultConfirmed} />
            <Stat label="본인인증" value={metrics.members.identityVerified} />
          </div>

          <h2>최근 14일 가입</h2>
          <ol className="metric-bars">
            {metrics.members.daily.map(day => (
              <li key={day.date}>
                <span>{day.date.slice(5)}</span>
                <span className="metric-bars__bar" style={{ width: `${(day.signups / maxDaily) * 100}%` }} />
                <span>{day.signups}</span>
              </li>
            ))}
          </ol>

          <h2>이용</h2>
          <div className="metric-grid">
            <Stat label={`${metrics.usage.month} 이용자`} value={metrics.usage.activeUsers} />
            <Stat label="AI 요청" value={metrics.usage.requests} note="대화 + 줄 다시 쓰기" />
            <Stat label="오늘 체험 메시지" value={metrics.trial.today} note={`어제 ${metrics.trial.yesterday}`} />
          </div>

          <h2>노래</h2>
          <div className="metric-grid">
            <Stat label="저장된 가사" value={metrics.songs.total} />
            <Stat label="채팅에서 저장" value={metrics.songs.fromChat} />
            <Stat label="체험 후 가입해 저장" value={metrics.songs.fromTrial} />
            <Stat label="AI로 만든 노래" value={metrics.songs.audio} />
          </div>

          <h2>준비 중 기능 관심</h2>
          <div className="metric-grid">
            {Object.keys(INTEREST_LABELS).map(key => (
              <Stat key={key} label={INTEREST_LABELS[key]} value={metrics.interest[key] ?? 0} />
            ))}
          </div>
          <p className="admin-page__hint">
            계산 시각 {new Date(metrics.generatedAt).toLocaleString('ko-KR')}. 체험 메시지는 이틀만 보관해 오늘과 어제만 보입니다.
          </p>
        </>
      ) : null}
    </main>
  );
}

export default function AdminMetricsPage() {
  return (
    <RequireAuth>
      <Head>
        <title>서비스 지표 | NovaSingerAI 관리자</title>
        <meta name="robots" content="noindex" />
      </Head>
      <MetricsView />
    </RequireAuth>
  );
}
