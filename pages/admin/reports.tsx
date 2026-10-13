import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

type ReportItem = {
  id: string;
  reason: string;
  detail: string | null;
  reporterId: string | null;
  createdAt: string | null;
};

type ReviewItem = {
  characterId: string;
  exists: boolean;
  name: string;
  avatarUrl: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  visibility: string | null;
  hidden: boolean;
  reportCount: number;
  creatorId: string | null;
  reports: ReportItem[];
};

type Action = 'hide' | 'restore' | 'dismiss' | 'unpublish';

const REASON_LABELS: Record<string, string> = {
  inappropriate: '부적절한 내용',
  copyright: '저작권·사칭',
  spam: '스팸·광고',
  other: '기타'
};

const ACTION_LABELS: Record<Action, { label: string; confirm: string }> = {
  hide: { label: '숨김', confirm: '공개 목록에서 숨길까요? 신고는 처리 완료로 표시됩니다.' },
  restore: { label: '숨김 해제', confirm: '다시 공개하고 신고 수를 0으로 초기화할까요?' },
  dismiss: { label: '신고 기각', confirm: '신고를 기각할까요? 캐릭터 공개 상태는 그대로 유지됩니다.' },
  unpublish: {
    label: '비공개 전환',
    confirm: '작성자의 캐릭터를 비공개로 바꾸고 공개 목록에서 삭제할까요? 작성자는 캐릭터를 계속 가지고 있습니다.'
  }
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    if (!user) throw new Error('로그인이 필요합니다.');
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  }, [user]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/admin/reports', { headers: await authHeaders() });
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? '목록을 불러오지 못했습니다.');
      setItems(payload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '목록을 불러오지 못했습니다.');
    }
  }, [authHeaders]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const runAction = async (item: ReviewItem, action: Action) => {
    if (!window.confirm(`[${item.name}] ${ACTION_LABELS[action].confirm}`)) return;
    setBusyId(item.characterId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/characters/${encodeURIComponent(item.characterId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? '처리하지 못했습니다.');
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '처리하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RequireAuth>
      <Head>
        <title>신고 검토 | NovaSingerAI 관리자</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="admin-page">
        <nav>
          <Link href="/dashboard">← 대시보드</Link>
        </nav>
        <h1>신고 검토</h1>
        <p className="admin-page__hint">
          처리 대기 중인 신고와 자동으로 숨겨진 캐릭터입니다. 숨김은 신고가 일정 수(기본 5건) 이상 쌓이면 자동으로 적용됩니다.
        </p>

        {forbidden ? <p className="admin-page__notice">관리자 권한이 없습니다.</p> : null}
        {error ? <p className="admin-page__notice admin-page__notice--error">{error}</p> : null}
        {!forbidden && items === null && !error ? <p className="admin-page__notice">불러오는 중...</p> : null}
        {items?.length === 0 ? <p className="admin-page__notice">처리할 신고가 없습니다.</p> : null}

        <div className="admin-page__list">
          {items?.map(item => (
            <article key={item.characterId} className="admin-card">
              <header className="admin-card__header">
                <Image
                  src={item.avatarUrl || DEFAULT_CHARACTER_AVATAR}
                  alt=""
                  width={48}
                  height={48}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h2>{item.name}</h2>
                  <p>
                    {item.hidden ? <span className="admin-badge admin-badge--hidden">숨김</span> : null}
                    <span className="admin-badge">{item.visibility === 'unlisted' ? '링크 공개' : '전체 공개'}</span>
                    <span className="admin-badge">누적 신고 {item.reportCount}건</span>
                  </p>
                </div>
              </header>

              {item.shortDescription || item.longDescription ? (
                <p className="admin-card__desc">{[item.shortDescription, item.longDescription].filter(Boolean).join(' — ')}</p>
              ) : null}

              {item.reports.length ? (
                <ul className="admin-card__reports">
                  {item.reports.map(report => (
                    <li key={report.id}>
                      <strong>{REASON_LABELS[report.reason] ?? report.reason}</strong>
                      <span>{formatDate(report.createdAt)}</span>
                      {report.detail ? <p>{report.detail}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-page__hint">처리 대기 중인 신고 없음 (숨김 상태만 남아 있음)</p>
              )}

              <div className="admin-card__actions">
                {(item.hidden ? (['restore', 'unpublish'] as Action[]) : (['hide', 'dismiss', 'unpublish'] as Action[])).map(
                  action => (
                    <button
                      key={action}
                      type="button"
                      className={`btn ${action === 'unpublish' || action === 'hide' ? 'btn--danger' : 'btn--ghost'}`}
                      disabled={busyId === item.characterId || !item.exists}
                      onClick={() => void runAction(item, action)}
                    >
                      {ACTION_LABELS[action].label}
                    </button>
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      </main>

      <style jsx>{`
        .admin-page {
          max-width: 860px;
          margin: 0 auto;
          padding: 32px 16px 80px;
        }

        h1 {
          margin: 16px 0 6px;
        }

        .admin-page__hint,
        .admin-page__notice {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .admin-page__notice--error {
          color: var(--danger);
        }

        .admin-page__list {
          display: grid;
          gap: 16px;
          margin-top: 20px;
        }

        .admin-card {
          border: 1px solid var(--divider);
          border-radius: 16px;
          padding: 18px;
          display: grid;
          gap: 12px;
        }

        .admin-card__header {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .admin-card__header h2 {
          margin: 0 0 4px;
          font-size: 1.05rem;
        }

        .admin-card__header p {
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .admin-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(167, 139, 250, 0.15);
        }

        .admin-badge--hidden {
          background: rgba(248, 113, 113, 0.2);
          color: #fca5a5;
        }

        .admin-card__desc {
          margin: 0;
          font-size: 0.88rem;
          color: var(--text-secondary);
          white-space: pre-wrap;
        }

        .admin-card__reports {
          margin: 0;
          padding-left: 1.1rem;
          display: grid;
          gap: 6px;
          font-size: 0.85rem;
        }

        .admin-card__reports span {
          margin-left: 8px;
          color: var(--text-secondary);
        }

        .admin-card__reports p {
          margin: 2px 0 0;
        }

        .admin-card__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
    </RequireAuth>
  );
}
