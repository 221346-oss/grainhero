"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard, Users, BarChart3, Cloud, Smartphone, Settings, LogOut,
  Package, OctagonAlert, ChevronDown, ChevronRight, Sparkles, QrCode,
  CreditCard, Shield, Brain, Zap, ClipboardList, Menu,
  Building2, Activity, Warehouse, PanelLeftClose, EyeOff,
} from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { LanguageSelector } from "@/components/language-selector"
import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/app/[locale]/providers"
import { api } from "@/lib/api"
import { useIsMobile } from "@/hooks/use-mobile"

// ── Types ──
interface NavItem {
  name: string; label: string; href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles: string[]; badge?: string;
}

function humanizeName(key: string) {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ══════════════════════════════════════
// NAVIGATION DATA (preserved)
// ══════════════════════════════════════
const dashboardNav = [
  { name: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
]
const grainOperationsNav = [
  { name: "grain-batches", label: "Grain Procurement & Intake", href: "/grain-batches", icon: Package, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "silos", label: "Storage Assignment", href: "/silos", icon: Warehouse, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "buyers", label: "Buyers & Dispatch", href: "/buyers", icon: Users, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "traceability", label: "Traceability", href: "/traceability", icon: QrCode, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
]
const iotMonitoringNav = [
  { name: "sensors", label: "Sensor & Actuator Setup", href: "/sensors", icon: Smartphone, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "actuators", label: "Actuators", href: "/actuators", icon: Zap, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "environmental", label: "Environmental Data", href: "/environmental", icon: Cloud, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "grain-alerts", label: "Alerts & Notifications", href: "/grain-alerts", icon: OctagonAlert, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
]
const aiAnalyticsNav = [
  { name: "ai-predictions", label: "AI Predictions", href: "/ai-predictions", icon: Sparkles, roles: ["super_admin", "admin", "manager", "technician"], badge: "AI" },
  { name: "model-performance", label: "ML Model Performance", href: "/model-performance", icon: Brain, roles: ["super_admin", "admin", "manager"], badge: "ML" },
  { name: "data-visualization", label: "Data Visualization", href: "/data-visualization", icon: BarChart3, roles: ["super_admin", "admin", "manager"], badge: "NEW" },
]
const businessNav = [
  { name: "payments", label: "Payments & Invoices", href: "/payments", icon: CreditCard, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "reports", label: "Reports & Analytics", href: "/reports", icon: BarChart3, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "analytics", label: "Analytics Dashboard", href: "/analytics", icon: BarChart3, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "activity-logs", label: "Activity Logs", href: "/activity-logs", icon: ClipboardList, roles: ["super_admin", "admin", "manager", "technician"], badge: "NEW" },
  { name: "insurance", label: "Insurance & Loss Claims", href: "/insurance", icon: Shield, roles: ["super_admin", "admin", "manager"], badge: undefined },
]
const systemNav = [
  // COMMENTED OUT - Not in core 10 modules
  { name: "team-management", label: "Team Management", href: "/team-management", icon: Users, roles: ["admin", "super_admin", "manager"], badge: undefined },
  { name: "settings", label: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "admin"], badge: undefined },
]
const superAdminNav: NavItem[] = [
  { name: "admin-management", label: "Customer Management", href: "/super-admin/customers", icon: Building2, roles: ["super_admin"], badge: "CORE" },
  { name: "plan-management", label: "Plan Management", href: "/super-admin/subscriptions", icon: CreditCard, roles: ["super_admin"], badge: "BIZ" },
  { name: "system-health", label: "System Health", href: "/system-health", icon: Activity, roles: ["super_admin"], badge: "LIVE" },
  { name: "global-analytics", label: "Global Analytics", href: "/global-analytics", icon: BarChart3, roles: ["super_admin"], badge: "DATA" },
]

// ══════════════════════════════════════
// SIDEBAR COMPONENT
// ══════════════════════════════════════
export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('Sidebar')
  const isMobile = useIsMobile()
  const { user, logout } = useAuth()
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const userRole = user?.role || "technician"

  // Desktop sidebar has 3 committed states: "expanded" (full width), "collapsed"
  // (icon-only rail), "hidden" (fully gone, edge handle to bring back).
  // `isPeeking` is a transient hover-only visual expansion of a collapsed rail —
  // it never changes the committed `mode`.
  type SidebarMode = "expanded" | "collapsed" | "hidden"
  const [mode, setMode] = useState<SidebarMode>("expanded")
  const [isPeeking, setIsPeeking] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [grainOpsExpanded, setGrainOpsExpanded] = useState(true)
  const [aiAnalyticsExpanded, setAiAnalyticsExpanded] = useState(false)
  const [iotMonitoringExpanded, setIotMonitoringExpanded] = useState(false)
  const [businessSystemExpanded, setBusinessSystemExpanded] = useState(true)
  const [systemExpanded, setSystemExpanded] = useState(true)
  const [alertStats, setAlertStats] = useState({ unresolved: 0, critical: 0 })
  const sidebarRef = useRef<HTMLElement>(null)

  const isHidden = !isMobile && mode === "hidden"
  // Drives content rendering (labels vs icon-only) — true for the committed
  // expanded state AND while peeking a collapsed rail on hover.
  const isExpanded = isMobile ? true : (mode === "expanded" || (mode === "collapsed" && isPeeking))
  // Drives the manual collapse/hide header controls — only shown when the
  // sidebar is *committed* to expanded, not during a transient hover peek.
  const isCommittedExpanded = !isMobile && mode === "expanded"

  // Close mobile sidebar on route change
  useEffect(() => { if (isMobile) setIsMobileOpen(false) }, [pathname, isMobile])

  // Lock body scroll when mobile open
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, isMobileOpen])

  // Auto-collapse to icon rail when the page content scrolls (desktop only).
  // Uses a capture-phase listener on `document` because `scroll` doesn't
  // bubble — this still catches scrolling on the `<main>` content area
  // (see app/[locale]/(authenticated)/layout.tsx) without needing a ref
  // into that layout. Scrolling inside the sidebar's own nav list is
  // excluded so it doesn't collapse itself.
  useEffect(() => {
    if (isMobile) return
    function handleContentScroll(event: Event) {
      if (sidebarRef.current && event.target instanceof Node && sidebarRef.current.contains(event.target)) return
      setMode(prev => (prev === "expanded" ? "collapsed" : prev))
      setIsPeeking(false)
    }
    document.addEventListener("scroll", handleContentScroll, true)
    return () => document.removeEventListener("scroll", handleContentScroll, true)
  }, [isMobile])

  // Escape key closes mobile
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileOpen(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // Hover-to-peek: temporarily reveal a collapsed rail on hover without
  // changing the committed mode. Click-to-stick: clicking anywhere on a
  // collapsed rail commits it open until scroll-collapse or manual collapse.
  const handleRailMouseEnter = useCallback(() => {
    if (isMobile || mode !== "collapsed") return
    setIsPeeking(true)
  }, [isMobile, mode])

  const handleRailMouseLeave = useCallback(() => {
    if (isMobile) return
    setIsPeeking(false)
  }, [isMobile])

  const handleRailClick = useCallback(() => {
    if (isMobile || mode !== "collapsed") return
    setMode("expanded")
    setIsPeeking(false)
  }, [isMobile, mode])

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    const res = await api.get<{ unresolved: number, critical: number }>("/api/alerts/stats")
    if (res.ok && res.data) {
      setAlertStats(res.data)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000) // Every minute
    return () => clearInterval(interval)
  }, [fetchStats])

  // Removed cleanup timeouts

  const handleNavClick = useCallback(() => {
    if (isMobile) setIsMobileOpen(false)
  }, [isMobile])

  // ── Role-based filtering (preserved) ──
  const hasAccess = (item: { roles?: string[] }) => !item.roles || item.roles.includes(userRole)
  const showOnlyManager = userRole === "manager" || userRole === "admin" || userRole === "super_admin"
  const showIoTSections = userRole === "admin" || userRole === "manager" || userRole === "technician" || userRole === "super_admin"
  const showBusinessSections = userRole === "admin" || userRole === "manager" || userRole === "super_admin"
  const showSystemSections = userRole === "admin" || userRole === "super_admin"

  const visibleDashboardNav = dashboardNav.filter(hasAccess)
  const visibleGrainOpsNav = showOnlyManager ? grainOperationsNav.filter(hasAccess) : []
  const visibleIoTNav = (showIoTSections ? iotMonitoringNav.filter(hasAccess) : []).map(item => {
    if (item.name === "grain-alerts" && alertStats.unresolved > 0) {
      return { ...item, badge: alertStats.unresolved > 99 ? "99+" : String(alertStats.unresolved) }
    }
    return item
  })
  const visibleAINav = showOnlyManager ? aiAnalyticsNav.filter(hasAccess) : []
  const visibleBusinessNav = showBusinessSections ? businessNav.filter(hasAccess) : []
  const visibleSystemNav = showSystemSections ? systemNav.filter(hasAccess) : []
  const visibleSuperAdminNav = superAdminNav.filter(hasAccess)

  // ══════════════════════════════════════
  // RENDER HELPERS
  // ══════════════════════════════════════
  function getLabel(item: NavItem) {
    return t(`${item.name}`, { fallback: item.label ?? humanizeName(item.name) })
  }

  function renderNavItem(item: NavItem) {
    const isActive = pathname === `/${currentLanguage}${item.href}`
    const label = getLabel(item)
    const Icon = item.icon

    if (!isExpanded) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            <Link href={`/${currentLanguage}${item.href}`} onClick={handleNavClick}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 group mb-1.5",
                isActive
                  ? "bg-emerald-50/60 text-emerald-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}>
              <Icon className={cn("h-[20px] w-[20px]", isActive ? "text-emerald-600" : "group-hover:text-slate-700")} strokeWidth={isActive ? 2 : 1.5} />
              {item.badge && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
              {isActive && (
                <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full" />
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="font-semibold text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg border-none shadow-xl">
            {label}
            {item.badge && <span className="ml-2 text-[10px] font-bold text-emerald-300">• {item.badge}</span>}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Link key={item.name} href={`/${currentLanguage}${item.href}`} onClick={handleNavClick}
        className={cn(
          "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all duration-300 group mb-1",
          isActive
            ? "bg-gradient-to-r from-emerald-50 to-emerald-50/20 text-emerald-700 ring-1 ring-emerald-200/50 shadow-sm"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        )}>
        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-600 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
        <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110", isActive ? "text-emerald-600" : "group-hover:text-slate-700")} strokeWidth={isActive ? 2.5 : 2} />
        <span className="truncate">{label}</span>
        {item.badge && (
          <Badge variant={item.badge === "AI" || item.badge === "ML" ? "default" : "secondary"}
            className={cn(
              "ml-auto text-[9px] px-1.5 py-0 h-4 shrink-0 font-bold uppercase tracking-wider",
              (item.badge === "AI" || item.badge === "ML") ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-100 text-slate-500"
            )}>
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  function renderSection(title: string, expanded: boolean, setExpanded: (v: boolean) => void, items: NavItem[], SectionIcon?: React.ElementType) {
    if (items.length === 0) return null

    if (!isExpanded) {
      const Icon = SectionIcon || Package
      return (
        <div key={title} className="py-2 border-t border-slate-50 mt-2 first:mt-0 first:border-0 flex flex-col items-center">
           <Tooltip>
             <TooltipTrigger asChild>
               <button onClick={() => setExpanded(!expanded)}
                 className={cn("relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group mb-1.5", expanded ? "text-emerald-600 bg-emerald-50 border border-emerald-100" : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 bg-slate-50/80 border border-slate-100")}>
                 <Icon className={cn("h-[20px] w-[20px] transition-transform", expanded ? "scale-110" : "group-hover:scale-110")} strokeWidth={1.5} />
                 <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                   <span className={cn("text-[10px] font-black", expanded ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-500")}>
                     {expanded ? "-" : "+"}
                   </span>
                 </div>
               </button>
             </TooltipTrigger>
             <TooltipContent side="right" sideOffset={12} className="font-semibold text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg border-none shadow-xl">
               {expanded ? "Collapse" : "Expand"} {title}
             </TooltipContent>
           </Tooltip>

           <div className={cn("overflow-hidden transition-all duration-300 w-full", expanded ? "max-h-[800px] opacity-100 mt-1" : "max-h-0 opacity-0")}>
             {items.map(renderNavItem)}
           </div>
        </div>
      )
    }

    return (
      <div key={title} className="mt-6 first:mt-0">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] hover:text-emerald-600 transition-colors group">
          <span className="group-hover:translate-x-1 transition-transform">{title}</span>
          {expanded ? <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" /> : <ChevronRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />}
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[800px] opacity-100 mt-1" : "max-h-0 opacity-0"
        )}>
          <div className="space-y-0.5">{items.map(renderNavItem)}</div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // SIDEBAR CONTENT
  // ══════════════════════════════════════
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-md">
      {/* ── Header ── */}
      <div className={cn(
        "flex items-center shrink-0 h-20 border-b border-slate-100/50",
        isExpanded ? "px-6 justify-between" : "px-0 justify-center"
      )}>
        {isExpanded ? (
          <>
            <Link href={`/${currentLanguage}/dashboard`} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform duration-300 ring-2 ring-emerald-50">
                <span className="text-white font-black text-lg">G</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 tracking-tight leading-tight">GrainHero</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">Enterprise</span>
              </div>
            </Link>
            {isCommittedExpanded && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setMode("collapsed")}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all">
                      <PanelLeftClose className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-slate-900 text-white font-bold border-none shadow-xl">
                    Collapse to icons
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setMode("hidden")}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all">
                      <EyeOff className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="bg-slate-900 text-white font-bold border-none shadow-xl">
                    Hide sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleRailClick} className="group mt-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-all duration-300 ring-2 ring-white">
                  <span className="text-white font-black text-xl">G</span>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={16} className="bg-slate-900 text-white font-bold border-none shadow-xl">
              Expand Menu
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{ __html: `::-webkit-scrollbar { display: none; }` }} />
        <div className="h-full">
          <nav className={cn("py-4", isExpanded ? "px-4" : "px-2")}>
            <div className="mb-4">
              {visibleDashboardNav.map(renderNavItem)}
            </div>
            {visibleGrainOpsNav.length > 0 && renderSection("Grain Operations", grainOpsExpanded, setGrainOpsExpanded, visibleGrainOpsNav, Package)}
            {visibleIoTNav.length > 0 && renderSection("IoT Monitoring", iotMonitoringExpanded, setIotMonitoringExpanded, visibleIoTNav, Activity)}
            {visibleAINav.length > 0 && renderSection("AI & Analytics", aiAnalyticsExpanded, setAiAnalyticsExpanded, visibleAINav, Brain)}
            {visibleBusinessNav.length > 0 && renderSection("Business & Reports", businessSystemExpanded, setBusinessSystemExpanded, visibleBusinessNav, BarChart3)}
            {visibleSuperAdminNav.length > 0 && renderSection("Platform Admin", true, () => {}, visibleSuperAdminNav, Building2)}
            {visibleSystemNav.length > 0 && renderSection("System Management", systemExpanded, setSystemExpanded, visibleSystemNav, Settings)}
          </nav>
        </div>
      </div>

      {/* ── Bottom ── */}
      <div className={cn("border-t border-slate-100/50 bg-slate-50/50 p-4 space-y-3 shrink-0", !isExpanded && "px-2 py-6 items-center")}>
        {isExpanded && <LanguageSelector />}

        {/* User Profile */}
        {isExpanded ? (
          <div onClick={() => { router.push("/profile"); handleNavClick() }}
            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white hover:shadow-md hover:shadow-slate-200/50 hover:ring-1 hover:ring-emerald-100 transition-all group">
            <div className="relative">
              {user?.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name || "User"} width={40} height={40}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl flex items-center justify-center ring-1 ring-emerald-200/50 shadow-sm group-hover:scale-105 transition-transform">
                  <span className="text-sm font-bold text-emerald-700">{user?.name?.[0] || "U"}</span>
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold text-slate-900 truncate">{user?.name || "Anonymous User"}</p>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-[0.1em] truncate">{user?.role?.replace('_', ' ') || "Guest"}</p>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => { router.push("/profile"); handleNavClick() }}
                className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-emerald-50 hover:shadow-sm hover:ring-1 hover:ring-emerald-200 transition-all mx-auto">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg flex items-center justify-center ring-1 ring-emerald-200/50 shadow-sm">
                  <span className="text-xs font-bold text-emerald-700">{user?.name?.[0] || "U"}</span>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="bg-slate-900 text-white font-bold border-none shadow-xl">
              {user?.name || "Profile"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Logout Button */}
        {isExpanded ? (
          <button onClick={() => { logout(); router.push(`/${currentLanguage}/auth/login`) }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-rose-100/50 transition-colors">
              <LogOut className="h-4 w-4" />
            </div>
            <span>Logout</span>
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => { logout(); router.push(`/${currentLanguage}/auth/login`) }}
                className="w-12 h-12 flex items-center justify-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all mx-auto">
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="bg-rose-600 text-white font-bold border-none">
              Sign Out
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Menu Button */}
      {isMobile && !isMobileOpen && (
        <button onClick={() => setIsMobileOpen(true)}
          className="fixed top-5 left-5 z-40 p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:scale-105 active:scale-95 transition-all">
          <Menu className="h-5 w-5 text-slate-700" />
        </button>
      )}

      {/* Backdrop */}
      {isMobile && (
        <div onClick={() => setIsMobileOpen(false)}
          className={cn(
            "fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-all duration-300",
            isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )} />
      )}

      {/* Sidebar Aside */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleRailMouseEnter}
        onMouseLeave={handleRailMouseLeave}
        onClick={handleRailClick}
        aria-hidden={isHidden}
        className={cn(
          "flex flex-col bg-white border-r border-slate-100 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
          isMobile ? "fixed inset-y-0 left-0 z-50 shadow-2xl" : "relative h-screen",
          isMobile && !isMobileOpen ? "-translate-x-full" : "translate-x-0",
          isHidden && "border-r-0 shadow-none"
        )}
        style={{
          width: isMobile ? (isExpanded ? 290 : 0) : isHidden ? 0 : isExpanded ? 280 : 80,
          pointerEvents: isHidden ? "none" : undefined,
        }}
      >
        {sidebarContent}
      </aside>

      {/* Edge handle to bring a fully-hidden sidebar back to the icon rail (desktop only) */}
      {!isMobile && mode === "hidden" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => setMode("collapsed")} aria-label="Show sidebar"
              className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-5 h-16 bg-white border border-l-0 border-slate-200 rounded-r-lg shadow-md hover:w-6 hover:bg-slate-50 transition-all duration-200">
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="bg-slate-900 text-white font-bold border-none shadow-xl">
            Show sidebar
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  )
}

