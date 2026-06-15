"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
//its replace
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
  login: (userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AUTH_CACHE_KEY = "soyol_auth_user";

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("auth_token="));
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(AUTH_CACHE_KEY);
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
  const [isLoading, setIsLoading] = useState(() => !readCachedUser());
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const setCartAuth = useCartStore((state) => state.setAuthenticated);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  useEffect(() => {
    if (readCachedUser()) setCartAuth(true);
  }, [setCartAuth]);

  useEffect(() => {
    // Skip network call when clearly logged out — avoids slow 401 round-trips
    if (!hasAuthCookie() && !readCachedUser()) {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          writeCachedUser(data.user);
          setCartAuth(true);
        } else {
          setUser(null);
          writeCachedUser(null);
          setCartAuth(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        writeCachedUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    writeCachedUser(userData);
    setCartAuth(true);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      writeCachedUser(null);
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
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        writeCachedUser(data.user);
      }
    } catch (error) {
      console.error("Refresh user failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
