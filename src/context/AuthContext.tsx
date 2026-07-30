import { fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  username: string | null;
  isLoading: boolean;
  error: Error | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUser: () => Promise<void>;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isAdmin: false,
  username: null,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType>({
  ...initialAuthState,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  },
  checkUser: async () => {
    throw new Error('AuthContext not initialized');
  },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  const checkUser = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      // Extract user groups to check if user is an admin
      const groups = session.tokens?.accessToken.payload['cognito:groups'] as string[] | undefined;
      const isAdmin = groups ? groups.includes('admin') : false;

      // Prefer a human-readable name from the ID token claims over the raw
      // Cognito username, which may be a UUID in Amplify Gen 2.
      const idPayload = session.tokens?.idToken?.payload;
      const rawName =
        (idPayload?.['preferred_username'] as string | undefined) ||
        (idPayload?.['name'] as string | undefined) ||
        (idPayload?.['email'] as string | undefined) ||
        currentUser.signInDetails?.loginId ||
        currentUser.username;
      const displayName = rawName?.includes('@') ? rawName.split('@')[0] : rawName;

      setAuthState({
        isAuthenticated: true,
        isAdmin,
        username: displayName ?? null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[AuthContext] checkUser failed:', err);
      setAuthState({
        isAuthenticated: false,
        isAdmin: false,
        username: null,
        isLoading: false,
        error: null,
      });
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkUser();
  }, []);

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await signIn({ username, password });
      if (result.isSignedIn) {
        setAuthState(prev => ({ ...prev, isAuthenticated: true }));
      }
      await checkUser();
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Login failed'),
      }));
      throw error;
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      await signOut();
      setAuthState({
        isAuthenticated: false,
        isAdmin: false,
        username: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Logout failed'),
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        checkUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

// Provider and hook intentionally share a file; the hook is not a component,
// so Fast Refresh is unaffected.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
