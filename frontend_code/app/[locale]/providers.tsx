"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { languages, type LanguageCode, type TranslationKey } from "@/lib/languages"
//import { usePathname } from "next/navigation"
//import { usePathname } from "next/navigation"

export interface User {
  id: string
  name: string
  email: string
  role: "super_admin" | "admin" | "manager" | "technician"
  language: LanguageCode
  phone?: string
  avatarUrl?: string // Add avatarUrl as optional for extensibility
  hasAccess?: string // Add hasAccess as optional for extensibility
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, userData?: any) => Promise<void>
  logout: () => void
  updateLanguage: (language: LanguageCode) => void
  isLoading: boolean
  refreshUser: () => Promise<void>
}

interface LanguageContextType {
  currentLanguage: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: TranslationKey) => string
  availableLanguages: Array<{ code: LanguageCode; name: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Plan Context
interface PlanContextType {
  plan: string;
  setPlan: (plan: string) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}

function LanguageProvider({
  children,
  initialLanguage = "en",
}: { children: React.ReactNode; initialLanguage?: LanguageCode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(initialLanguage)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    // Extract locale from the URL
    const segments = pathname.split("/")
    const urlLocale = segments[1]
    const isValidLocale = (code: string): code is LanguageCode => Object.keys(languages).includes(code)
    if (urlLocale && isValidLocale(urlLocale)) {
      setCurrentLanguage(urlLocale)
      localStorage.setItem("farm-home-language", urlLocale)
    } else {
      // fallback to saved or initial
      const savedLanguage = localStorage.getItem("farm-home-language") as LanguageCode
      if (savedLanguage && languages[savedLanguage]) {
        setCurrentLanguage(savedLanguage)
      } else {
        setCurrentLanguage(initialLanguage)
      }
    }
  }, [pathname, initialLanguage])

  const setLanguage = (language: LanguageCode) => {
    setCurrentLanguage(language)
    localStorage.setItem("farm-home-language", language)
  }

  const t = (key: TranslationKey): string => {
    const translations = languages[currentLanguage]?.translations;
    if (translations && key in translations) {
      return translations[key as keyof typeof translations] as string;
    }
    const enTranslations = languages.en.translations;
    if (enTranslations && key in enTranslations) {
      return enTranslations[key as keyof typeof enTranslations] as string;
    }
    return key;
  }

  const availableLanguages = Object.values(languages).map((lang) => ({
    code: lang.code as LanguageCode,
    name: lang.name,
  }))

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Simple (demo) encryption helpers using base64 (replace with real crypto for production)
function encryptPlan(plan: string): string {
  return btoa(plan);
}
function decryptPlan(encrypted: string): string {
  try {
    return atob(encrypted);
  } catch {
    return "basic";
  }
}
function encryptAccess(access: string): string {
  return btoa(access);
}
function decryptAccess(encrypted: string): string {
  try {
    return atob(encrypted);
  } catch {
    return "none";
  }
}

function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<string>("basic");

  useEffect(() => {
    const saved = localStorage.getItem("subscriptionPlan");
    if (saved) setPlanState(decryptPlan(saved));
  }, []);

  const setPlan = (plan: string) => {
    setPlanState(plan);
    localStorage.setItem("subscriptionPlan", encryptPlan(plan));
  };

  return (
    <PlanContext.Provider value={{ plan, setPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

import { api } from "@/lib/api"
import { initializePushNotifications } from "@/lib/push-notifications"

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem("farm-home-user")
    const savedAccess = localStorage.getItem("farm-home-access")
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    if (parsedUser && savedAccess) {
      parsedUser.hasAccess = decryptAccess(savedAccess);
    }
    setUser(parsedUser)
    setIsLoading(false)

    // Initialize push notifications
    initializePushNotifications().catch((error) => {
      console.error('[App] Failed to initialize push notifications:', error);
    });

    // Listen for user updates from other components (e.g., PlansPage)
    const handleUserUpdate = (e: Event) => {
      if ('detail' in e && e.detail) {
        setUser(e.detail as User);
      }
    };
    window.addEventListener('farm-home-user-updated', handleUserUpdate as EventListener);
    return () => {
      window.removeEventListener('farm-home-user-updated', handleUserUpdate as EventListener);
    };
  }, [])

  const refreshUser = async () => {
    try {
      const res = await api.get<any>("/auth/me")
      if (!res.ok || !res.data) throw new Error('Failed to fetch user info');
      const data = res.data
      if (data.hasAccess) {
        localStorage.setItem('farm-home-access', encryptAccess(data.hasAccess));
      }
      const userObj = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        language: data.language || 'en',
        phone: data.phone,
        avatarUrl: data.avatar,
        hasAccess: data.hasAccess || 'none',
      };
      setUser(userObj);
      localStorage.setItem('farm-home-user', JSON.stringify(userObj));
    } catch {
      // Optionally handle error
    }
  };

  const login = async (email: string, password: string, userData?: any) => {
    setIsLoading(true)
    try {
      let data = userData
      if (!data) {
        const res = await api.post<any>("/auth/login", { email, password })
        if (!res.ok || !res.data) throw new Error("Login failed")
        data = res.data
      }
      
      // Persist JWT for authenticated API calls
      if (data.token) {
        localStorage.setItem("token", data.token)
      }
      // Save encrypted hasAccess
      if (data.hasAccess) {
        localStorage.setItem("farm-home-access", encryptAccess(data.hasAccess))
      }
      // Store firstLogin flag for welcome notification
      if (data.firstLogin) {
        localStorage.setItem("firstLogin", "true")
      }
      // Store subscription plan
      if (data.subscriptionPlan) {
        localStorage.setItem("subscriptionPlan", encryptPlan(data.subscriptionPlan))
      }
      // Save user info
      const userObj = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        language: data.language || "en",
        phone: data.phone,
        avatarUrl: data.avatar,
        hasAccess: data.hasAccess || "none",
      }
      setUser(userObj)
      localStorage.setItem("farm-home-user", JSON.stringify(userObj))
    } catch {
      setUser(null)
      localStorage.removeItem("token")
    }
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("farm-home-user")
    localStorage.removeItem("farm-home-access")
    localStorage.removeItem("token")
  }

  const updateLanguage = (language: LanguageCode) => {
    if (user) {
      const updatedUser = { ...user, language }
      setUser(updatedUser)
      localStorage.setItem("farm-home-user", JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateLanguage, isLoading, refreshUser }}>
      <LanguageProvider initialLanguage={user?.language || "en"}>
        <PlanProvider>{children}</PlanProvider>
      </LanguageProvider>
    </AuthContext.Provider>
  )
}
