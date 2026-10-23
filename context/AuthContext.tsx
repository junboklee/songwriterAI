import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { ageGateState, type AgeGateState } from '@/lib/age';
import { auth } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  // Adult-only policy (lib/age.ts); null while signed out or not yet known.
  ageGate: AgeGateState | null;
  // Re-reads the age claim after POST /api/profile/age.
  refreshAgeGate: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  ageGate: null,
  refreshAgeGate: async () => undefined
});

async function readAgeGate(user: User, forceRefresh = false): Promise<AgeGateState> {
  const { claims } = await user.getIdTokenResult(forceRefresh);
  const created = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
  return ageGateState({ confirmed: Boolean(claims.adultConfirmedAt), createdAt: created });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ageGate, setAgeGate] = useState<AgeGateState | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      // The server checks the age again on every request, so a failed read here only delays the gate.
      setAgeGate(currentUser ? await readAgeGate(currentUser).catch(() => null) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshAgeGate = useCallback(async () => {
    if (auth.currentUser) {
      setAgeGate(await readAgeGate(auth.currentUser, true));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, ageGate, refreshAgeGate }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
