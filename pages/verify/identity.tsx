import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { confirmIdentityOnServer } from '@/lib/portone';

// Landing page for PortOne's mobile redirect after identity verification (lib/portone.ts).
// PortOne appends identityVerificationId, and code/message when it failed.
function VerifyIdentity() {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<{ kind: 'working' | 'done' | 'error'; message?: string }>({ kind: 'working' });

  useEffect(() => {
    if (!router.isReady || !user) {
      return;
    }
    const { identityVerificationId, code, message } = router.query;
    if (typeof code === 'string' && code) {
      setState({ kind: 'error', message: typeof message === 'string' ? message : '본인인증을 마치지 못했어요.' });
      return;
    }
    if (typeof identityVerificationId !== 'string') {
      setState({ kind: 'error', message: '본인인증 정보가 없어요.' });
      return;
    }
    void confirmIdentityOnServer(() => user.getIdToken(), identityVerificationId).then(result =>
      setState(result.ok ? { kind: 'done' } : { kind: 'error', message: result.message })
    );
  }, [router.isReady, router.query, user]);

  return (
    <main className="age-gate">
      <div className="age-gate__card">
        <h1>본인인증</h1>
        {state.kind === 'working' ? <p>확인하는 중이에요...</p> : null}
        {state.kind === 'done' ? <p>본인인증을 마쳤어요. 보관함에서 30초 미리듣기를 무료로 만들 수 있어요.</p> : null}
        {state.kind === 'error' ? <p className="age-gate__error">{state.message}</p> : null}
        <Link href="/suno" className="btn btn--primary">
          가사 보관함으로 가기
        </Link>
      </div>
    </main>
  );
}

export default function VerifyIdentityPage() {
  return (
    <RequireAuth>
      <VerifyIdentity />
    </RequireAuth>
  );
}
