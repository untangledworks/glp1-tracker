import { createContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, signUp, fetchAuthSession } from 'aws-amplify/auth';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
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
    await signIn({ username: email, password });
    await checkAuth();
  }

  async function handleSignUp(email: string, password: string) {
    await signUp({ username: email, password });
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
  }

  async function getToken(): Promise<string> {
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
