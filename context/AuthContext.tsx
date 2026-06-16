"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import {
  authFetch,
  installAuthFetchInterceptor,
  readAuthToken,
  writeAuthToken,
} from "@/lib/clientAuth";
import { notifyAuthReady } from "@/lib/authEvents";

interface User {
  id: string;
  phone: string;
  role: "admin" | "user";
  status: "available" | "in-call";
  name?: string;
  fullName?: string;
  firstName?: string;
  email?: string;
  image?: string;
  imageUrl?: string;
  primaryEmailAddress?: { emailAddress: string };
  publicMetadata?: { role?: string };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (userData: User, token?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AUTH_CACHE_KEY = "soyol_auth_user";

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const cached =
      localStorage.getItem(AUTH_CACHE_KEY) ||
      sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    const user = JSON.parse(cached) as User;
    try {
      localStorage.setItem(AUTH_CACHE_KEY, cached);
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    } catch {
      // ignore quota errors
    }
    return user;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // ignore quota errors
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const setCartAuth = useCartStore((state) => state.setAuthenticated);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  useEffect(() => {
    installAuthFetchInterceptor();
  }, []);

  useEffect(() => {
    if (readCachedUser() || readAuthToken()) setCartAuth(true);
  }, [setCartAuth]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          writeCachedUser(data.user);
          setCartAuth(true);
          notifyAuthReady();
        } else if (res.status === 401) {
          setUser(null);
          writeCachedUser(null);
          writeAuthToken(null);
          setCartAuth(false);
        } else {
          const cached = readCachedUser();
          if (!cached) {
            setUser(null);
            setCartAuth(false);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        const cached = readCachedUser();
        if (!cached && !readAuthToken()) {
          setUser(null);
          setCartAuth(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [setCartAuth]);

  const login = (userData: User, token?: string) => {
    if (token) writeAuthToken(token);
    setUser(userData);
    writeCachedUser(userData);
    setCartAuth(true);
    setIsLoading(false);
    notifyAuthReady();
  };

  const logout = async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      writeCachedUser(null);
      writeAuthToken(null);
      setCartAuth(false);
      clearWishlist();
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        writeCachedUser(data.user);
        setCartAuth(true);
      } else if (res.status === 401) {
        setUser(null);
        writeCachedUser(null);
        writeAuthToken(null);
        setCartAuth(false);
      }
    } catch (error) {
      console.error("Refresh user failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !isLoading && !!user,
        isLoading,
        isAdmin: user?.role === "admin",
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Returns { user, isSignedIn, isLoaded } for component consumption. */
export const useUser = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  return { user, isSignedIn: isAuthenticated, isLoaded: !isLoading };
};
