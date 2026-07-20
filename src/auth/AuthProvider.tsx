import { createContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, signUp, fetchAuthSession } from 'aws-amplify/auth';

const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

interface AuthUser {
  userId: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(IS_MOCK ? { userId: 'mock-user-123', email: 'dev@test.com' } : null);
  const [isLoading, setIsLoading] = useState(!IS_MOCK);

  useEffect(() => {
    if (!IS_MOCK) checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentUser();
      setUser({ userId: currentUser.userId, email: currentUser.signInDetails?.loginId || '' });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn(email: string, password: string) {
    if (IS_MOCK) {
      setUser({ userId: 'mock-user-123', email });
      return;
    }
    await signIn({ username: email, password });
    await checkAuth();
  }

  async function handleSignUp(email: string, password: string) {
    if (IS_MOCK) return;
    await signUp({ username: email, password });
  }

  async function handleSignOut() {
    if (IS_MOCK) {
      setUser(null);
      return;
    }
    await signOut();
    setUser(null);
  }

  async function getToken(): Promise<string> {
    if (IS_MOCK) return 'mock-token';
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || '';
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
