"use client"

import { useEffect } from "react"
import { useAuth } from "@/app/[locale]/providers"
import { useRouter, usePathname } from "next/navigation"
import { validateUserSession } from "@/lib/auth-utils"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  fallbackRoute?: string
}

export function AuthGuard({ children, requiredRoles, fallbackRoute = "/not-allowed" }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    const validation = validateUserSession(user, pathname)
    
    if (!validation.isValid) {
      router.push(validation.redirectTo || fallbackRoute)
      return
    }

    // Additional role-based checks if requiredRoles is provided
    if (requiredRoles && user && !requiredRoles.includes(user.role)) {
      router.push(fallbackRoute)
      return
    }
  }, [user, isLoading, pathname, router, requiredRoles, fallbackRoute])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if user is not authenticated or doesn't have required role
  if (!user) {
    return null
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}

// Specific role-based guards for convenience
export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["super_admin"]}>{children}</AuthGuard>
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["super_admin", "admin"]}>{children}</AuthGuard>
}

export function ManagerGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["super_admin", "admin", "manager"]}>{children}</AuthGuard>
}

export function TechnicianGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["super_admin", "admin", "manager", "technician"]}>{children}</AuthGuard>
}
