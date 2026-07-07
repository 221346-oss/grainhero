 "use client"
 
 import { useCallback, useEffect, useState } from "react"
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
 import { Button } from "@/components/ui/button"
 import { AnimatedBackground } from "@/components/animations/MotionGraphics"
 import { Brain, LineChart, RefreshCw, Database, AlertTriangle } from "lucide-react"
 
 interface ModelPerformanceSummary {
   performance_summary?: Record<string, unknown>
   training_insights?: Record<string, unknown>
   recommendations?: string[]
   model_info?: {
     name: string
     version: string
     algorithm: string
     features: string[]
     target_classes: string[]
   }
 }
 
 interface TrainingHistory {
   training_sessions: Array<Record<string, unknown>>
   total_sessions: number
   performance_trends: Record<string, unknown>
 }
 
 export default function AiAnalyticsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
   const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
   const [perf, setPerf] = useState<ModelPerformanceSummary | null>(null)
   const [history, setHistory] = useState<TrainingHistory | null>(null)
   const [loading, setLoading] = useState(false)
 
   const fetchData = useCallback(async () => {
     try {
       const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
       const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
       const p = await fetch(`${backendUrl}/api/ai-spoilage/model-performance`, { headers })
       const h = await fetch(`${backendUrl}/api/ai-spoilage/training-history`, { headers })
       if (p.ok) setPerf(await p.json())
       if (h.ok) setHistory(await h.json())
     } catch {}
   }, [backendUrl])
 
   useEffect(() => {
     fetchData()
   }, [fetchData])
 
   const retrain = async () => {
     try {
       setLoading(true)
       const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
       const res = await fetch(`${backendUrl}/api/ai-spoilage/retrain`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           ...(token ? { Authorization: `Bearer ${token}` } : {})
         },
         body: JSON.stringify({ force_retrain: false })
       })
       if (res.ok) {
         await fetchData()
       }
     } finally {
       setLoading(false)
     }
   }
 
   return (
     <AnimatedBackground className="min-h-screen">
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
         <div className="flex items-center justify-between">
           <div>
             <h2 className="text-3xl font-bold tracking-tight">AI & Analytics</h2>
             <p className="text-muted-foreground">Model performance, training history, and controls</p>
           </div>
           <div className="flex items-center space-x-2">
             <Button onClick={fetchData} variant="outline">
               <RefreshCw className="w-4 h-4 mr-2" />
               Refresh
             </Button>
             <Button onClick={retrain} className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
               <Brain className="w-4 h-4 mr-2" />
               {loading ? "Retraining…" : "Retrain Model"}
             </Button>
           </div>
         </div>
 
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Database className="w-5 h-5" />
               Model Overview
             </CardTitle>
             <CardDescription>SmartBin-RiceSpoilage current configuration</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="grid gap-4 md:grid-cols-3">
               <div className="border rounded-lg p-4">
                 <div className="text-xs uppercase text-muted-foreground">Name</div>
                 <div className="text-lg font-semibold">{perf?.model_info?.name || "--"}</div>
                 <div className="text-xs uppercase text-muted-foreground mt-3">Version</div>
                 <div className="text-lg font-semibold">{perf?.model_info?.version || "--"}</div>
               </div>
               <div className="border rounded-lg p-4">
                 <div className="text-xs uppercase text-muted-foreground">Algorithm</div>
                 <div className="text-lg font-semibold">{perf?.model_info?.algorithm || "--"}</div>
                 <div className="text-xs uppercase text-muted-foreground mt-3">Targets</div>
                 <div className="text-lg font-semibold">{(perf?.model_info?.target_classes || []).join(", ") || "--"}</div>
               </div>
               <div className="border rounded-lg p-4">
                 <div className="text-xs uppercase text-muted-foreground">Features</div>
                 <div className="text-sm">{(perf?.model_info?.features || []).join(", ") || "--"}</div>
               </div>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <LineChart className="w-5 h-5" />
               Training History
             </CardTitle>
             <CardDescription>Recent sessions and insights</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="grid gap-4 md:grid-cols-3">
               <div className="border rounded-lg p-4">
                 <div className="text-xs uppercase text-muted-foreground">Total Sessions</div>
                 <div className="text-lg font-semibold">{history?.total_sessions ?? 0}</div>
               </div>
               <div className="border rounded-lg p-4">
                 <div className="text-xs uppercase text-muted-foreground">Latest Session</div>
                 <div className="text-sm">
                   {history?.training_sessions?.length
                     ? JSON.stringify(history.training_sessions[history.training_sessions.length - 1]).slice(0, 120) + "…"
                     : "None"}
                 </div>
               </div>
               <div className="border rounded-lg p-4">
                 <div className="text-xs uppercase text-muted-foreground">Recommendations</div>
                 <div className="text-sm">{(perf?.recommendations || []).slice(0, 5).join("; ") || "—"}</div>
               </div>
             </div>
             <div className="mt-4">
               <Button variant="outline" onClick={() => { const locale = window.location.pathname.split('/')[1] || 'en'; window.location.href = `/${locale}/spoilage-analysis` }}>
                 <AlertTriangle className="w-4 h-4 mr-2" />
                 Open Spoilage Analysis
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     </AnimatedBackground>
   )
 }
