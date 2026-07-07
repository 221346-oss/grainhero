"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from "@/app/[locale]/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus,
  Shield,
  DollarSign,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Upload,
  Download,
  X,
  Camera,
  Flame,
  Bug,
  Droplets,
  Thermometer,
  Wind,
  RefreshCw,
  Eye,
  Calendar,
  Mail,
  Send,
  MessageSquare,
  History,
  UserCheck,
  FileSearch,
  Check,
  Search,
  BarChart3, Activity,
} from 'lucide-react'
import { api } from '@/lib/api'
import { config } from '@/config'
import { cn } from '@/lib/utils'

// ── Interfaces ──────────────────────────────────────────
interface InsurancePolicy {
  _id: string
  policy_number: string
  provider_name: string
  coverage_type: string
  coverage_amount: number
  premium_amount: number
  deductible: number
  status: string
  start_date: string
  end_date: string
  renewal_date: string
  covered_batches: Array<{
    batch_id: string
    grain_type: string
    quantity_kg: number
    coverage_value: number
  }>
  risk_factors: {
    fire_risk: number
    theft_risk: number
    spoilage_risk: number
    weather_risk: number
  }
  claims_count: number
  total_claims_amount: number
}

interface InsuranceClaim {
  _id: string
  claim_number: string
  policy_id: any // can be object or ID
  claim_type: string
  description: string
  amount_claimed: number
  amount_approved: number
  status: string
  incident_date: string
  filed_date: string
  approved_date?: string
  photos?: string[]
  batch_affected: {
    batch_id: any
    grain_type: string
    quantity_affected: number
  }
  created_by?: any
  reviewed_by?: any
  review_date?: string
  investigation?: {
    findings: string
    cause_of_loss: string
    preventable: boolean
    assigned_to: any
    started_at: string
    completed_at: string
  }
  assessment?: {
    assessed_by: any
    assessed_at: string
    estimated_damage_value: number
    repair_estimate: number
    settlement_recommendation: number
    internal_notes: string
  }
  payment?: {
    amount: number
    payment_method: string
    payment_reference: string
    payment_date: string
    processed_by: any
  }
  communications?: Array<{
    from_user: any
    message: string
    sent_at: string
  }>
  supporting_documents?: Array<{
    document_type: string
    file_url: string
    original_name: string
    uploaded_by: any
    uploaded_at: string
  }>
}

interface SpoilageEvent {
  event_id: string
  event_type: string
  severity: string
  description: string
  estimated_loss_kg: number
  estimated_value_loss: number
  detected_date: string
  reported_by: string
  photos: Array<{ path: string; original_name: string; upload_date: string }>
  environmental_conditions: Record<string, unknown>
}

interface GrainBatch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  spoilage_events?: SpoilageEvent[]
}

// ── Helpers ─────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  mold: <Bug className="h-4 w-4" />,
  pests: <Bug className="h-4 w-4" />,
  moisture: <Droplets className="h-4 w-4" />,
  heat: <Thermometer className="h-4 w-4" />,
  smell: <Wind className="h-4 w-4" />,
  contamination: <AlertTriangle className="h-4 w-4" />,
  fire: <Flame className="h-4 w-4" />,
  other: <AlertTriangle className="h-4 w-4" />,
}

// ── Component ───────────────────────────────────────────
export default function InsurancePage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'super_admin'

  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [batches, setBatches] = useState<GrainBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Review Queue state
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewTab, setReviewTab] = useState('details') // details, investigation, assessment, payment

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimSaving, setClaimSaving] = useState(false)
  const [claimPhotos, setClaimPhotos] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [claimForm, setClaimForm] = useState({
    policy_id: '', claim_type: 'Spoilage', description: '',
    amount_claimed: 0, incident_date: '', batch_id: '', quantity_affected: 0,
  })

  // Spoilage event form
  const [showSpoilageModal, setShowSpoilageModal] = useState(false)
  const [spoilageSaving, setSpoilageSaving] = useState(false)
  const [spoilagePhotos, setSpoilagePhotos] = useState<File[]>([])
  const [spoilageForm, setSpoilageForm] = useState({
    batch_id: '', event_type: 'mold', severity: 'medium',
    description: '', estimated_loss_kg: 0, estimated_value_loss: 0,
  })

  // Timeline data
  const [selectedBatchForTimeline, setSelectedBatchForTimeline] = useState<string>('')
  const [timelineEvents, setTimelineEvents] = useState<SpoilageEvent[]>([])

  // Claim detail view

  const [showClaimDetail, setShowClaimDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [claimNote, setClaimNote] = useState('')

  // Insurance request form
  const [requestSending, setRequestSending] = useState(false)
  const [requestForm, setRequestForm] = useState({
    preferred_provider: 'EFU', coverage_type: 'Comprehensive', message: '',
  })

  // ── Data Loading ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [policiesRes, claimsRes, batchesRes] = await Promise.all([
        api.get<{ policies: InsurancePolicy[] }>('/api/insurance/policies?limit=50'),
        api.get<{ claims: InsuranceClaim[] }>('/api/insurance/claims?limit=50'),
        api.get<{ batches: GrainBatch[] }>('/api/grain-batches?limit=100'),
      ])
      if (policiesRes.ok && policiesRes.data) setPolicies(policiesRes.data.policies as unknown as InsurancePolicy[])
      if (claimsRes.ok && claimsRes.data) setClaims(claimsRes.data.claims as unknown as InsuranceClaim[])
      if (batchesRes.ok && batchesRes.data) setBatches((batchesRes.data.batches || []) as unknown as GrainBatch[])
    } catch {
      toast.error('Failed to load insurance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Load timeline when batch selected
  useEffect(() => {
    if (!selectedBatchForTimeline) { setTimelineEvents([]); return }
    const batch = batches.find(b => b._id === selectedBatchForTimeline)
    setTimelineEvents(batch?.spoilage_events || [])
  }, [selectedBatchForTimeline, batches])



  // ── Claim Handlers ────────────────────────────────────
  const openClaimModal = (policy?: InsurancePolicy) => {
    setClaimForm(prev => ({ ...prev, policy_id: policy?._id || policies[0]?._id || '', claim_type: 'Spoilage', description: '', amount_claimed: 0, incident_date: new Date().toISOString().slice(0, 10), batch_id: batches[0]?._id || '', quantity_affected: 0 }))
    setClaimPhotos([])
    setShowClaimModal(true)
  }

  const submitClaimWithPhotos = async () => {
    if (claimPhotos.length === 0) { toast.error('Please upload at least one damage photo'); return }
    setClaimSaving(true)
    setUploadingPhotos(true)
    try {
      const photoUrls: string[] = []
      for (const photo of claimPhotos) {
        const fd = new FormData(); fd.append('photo', photo); fd.append('claim_type', claimForm.claim_type)
        const uploadRes = await api.postFormData<{ url: string }>('/api/insurance/upload-photo', fd)
        if (uploadRes.ok && uploadRes.data) photoUrls.push(uploadRes.data.url)
      }
      const body = { ...claimForm, amount_claimed: Number(claimForm.amount_claimed), batch_affected: { batch_id: claimForm.batch_id, quantity_affected: Number(claimForm.quantity_affected) }, photos: photoUrls }
      const res = await api.post('/api/insurance/claims', body)
      if (res.ok) { toast.success('Claim filed with photos'); setShowClaimModal(false); setClaimPhotos([]); loadData() }
      else toast.error(res.error || 'Failed to file claim')
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally {
      setClaimSaving(false)
      setUploadingPhotos(false)
    }
  }

  // ── Spoilage Event Handlers ───────────────────────────
  const submitSpoilageEvent = async () => {
    if (!spoilageForm.batch_id) { toast.error('Select a batch'); return }
    setSpoilageSaving(true)
    try {
      const res = await api.post(`/api/logging/batches/${spoilageForm.batch_id}/spoilage-events`, {
        event_type: spoilageForm.event_type, severity: spoilageForm.severity,
        description: spoilageForm.description, estimated_loss_kg: Number(spoilageForm.estimated_loss_kg),
        estimated_value_loss: Number(spoilageForm.estimated_value_loss),
      })
      if (res.ok) {
        toast.success('Spoilage event logged')
        // Upload photos if any
        const resData = res.data as { event: { event_id: string } }
        if (spoilagePhotos.length > 0 && resData?.event?.event_id) {
          const eventId = resData.event.event_id
          const fd = new FormData()
          spoilagePhotos.forEach(p => fd.append('photos', p))
          await api.postFormData(`/api/logging/batches/${spoilageForm.batch_id}/spoilage-events/${eventId}/photos`, fd)
        }
        setShowSpoilageModal(false); setSpoilagePhotos([]); loadData()
      } else toast.error((res as { error?: string }).error || 'Failed to log spoilage event')
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setSpoilageSaving(false) }
  }

  // ── Insurance Export ──────────────────────────────────
  const downloadInsuranceExport = async (batchId: string, format: string, claimNumber: string) => {
    try {
      const blob = await api.download(`/api/grain-batches/${batchId}/export-insurance?format=${format}`)
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `claim-${claimNumber}-${format}.json`; a.click()
        toast.success(`${format.toUpperCase()} export downloaded`)
      } else toast.error('Failed to export')
    } catch { toast.error('Export failed') }
  }

  // ── Batch Report Download ─────────────────────────────
  const downloadBatchReport = async (batchId: string, batchRef: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${config.backendUrl}/api/logging/batches/${batchId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `batch-report-${batchRef}.pdf`; a.click()
      URL.revokeObjectURL(url); toast.success('Report downloaded!')
    } catch { toast.error('Failed to download report') }
  }

  // ── Claim Lifecycle Handlers ──────────────────────────
  const updateClaimStatus = async (claimId: string, status: string, notes: string = '') => {
    setActionLoading(true)
    try {
      const res = await api.put(`/api/insurance/claims/${claimId}/status`, { status, notes })
      if (res.ok) {
        toast.success(`Claim status updated to ${status}`)
        loadData()
        // Refresh selected claim
        const updatedClaimRes = await api.get<{ claim: InsuranceClaim }>(`/api/insurance/claims/${claimId}`)
        if (updatedClaimRes.ok && updatedClaimRes.data) setSelectedClaim(updatedClaimRes.data.claim)
      } else {
        toast.error(res.error || 'Failed to update status')
      }
    } catch { toast.error('Error updating status') }
    finally { setActionLoading(false) }
  }

  const submitClaimReview = async (claimId: string, approved: boolean, notes: string) => {
    setActionLoading(true)
    try {
      const res = await api.post(`/api/insurance/claims/${claimId}/review`, { approved, notes })
      if (res.ok) {
        toast.success(approved ? 'Claim approved' : 'Claim rejected')
        loadData()
        const updatedClaimRes = await api.get<{ claim: InsuranceClaim }>(`/api/insurance/claims/${claimId}`)
        if (updatedClaimRes.ok && updatedClaimRes.data) setSelectedClaim(updatedClaimRes.data.claim)
      } else { toast.error(res.error || 'Failed to submit review') }
    } catch { toast.error('Error submitting review') }
    finally { setActionLoading(false) }
  }

  const submitInvestigation = async (claimId: string, findings: string, cause: string) => {
    setActionLoading(true)
    try {
      const res = await api.put(`/api/insurance/claims/${claimId}/investigation`, { findings, cause_of_loss: cause, preventable: false })
      if (res.ok) {
        toast.success('Investigation submitted')
        loadData()
        const updatedClaimRes = await api.get<{ claim: InsuranceClaim }>(`/api/insurance/claims/${claimId}`)
        if (updatedClaimRes.ok && updatedClaimRes.data) setSelectedClaim(updatedClaimRes.data.claim)
      } else { toast.error(res.error || 'Failed to submit investigation') }
    } catch { toast.error('Error submitting investigation') }
    finally { setActionLoading(false) }
  }

  const submitAssessment = async (claimId: string, amount: number, notes: string) => {
    setActionLoading(true)
    try {
      const res = await api.put(`/api/insurance/claims/${claimId}/assessment`, { settlement_recommendation: amount, internal_notes: notes })
      if (res.ok) {
        toast.success('Assessment completed')
        loadData()
        const updatedClaimRes = await api.get<{ claim: InsuranceClaim }>(`/api/insurance/claims/${claimId}`)
        if (updatedClaimRes.ok && updatedClaimRes.data) setSelectedClaim(updatedClaimRes.data.claim)
      } else { toast.error(res.error || 'Failed to submit assessment') }
    } catch { toast.error('Error submitting assessment') }
    finally { setActionLoading(false) }
  }

  const processPayment = async (claimId: string, amount: number, method: string, ref: string) => {
    setActionLoading(true)
    try {
      const res = await api.post(`/api/insurance/claims/${claimId}/payment`, { amount, payment_method: method, payment_reference: ref })
      if (res.ok) {
        toast.success('Payment processed successfully')
        loadData()
        const updatedClaimRes = await api.get<{ claim: InsuranceClaim }>(`/api/insurance/claims/${claimId}`)
        if (updatedClaimRes.ok && updatedClaimRes.data) setSelectedClaim(updatedClaimRes.data.claim)
      } else { toast.error(res.error || 'Failed to process payment') }
    } catch { toast.error('Error processing payment') }
    finally { setActionLoading(false) }
  }

  const addClaimNote = async (claimId: string) => {
    if (!claimNote.trim()) return
    try {
      const res = await api.post(`/api/insurance/claims/${claimId}/notes`, { message: claimNote })
      if (res.ok) {
        setClaimNote('')
        const updatedClaimRes = await api.get<{ claim: InsuranceClaim }>(`/api/insurance/claims/${claimId}`)
        if (updatedClaimRes.ok && updatedClaimRes.data) setSelectedClaim(updatedClaimRes.data.claim)
      }
    } catch { toast.error('Failed to add note') }
  }

  // ── Request Insurance from Super Admin ────────────────
  const sendInsuranceRequest = async () => {
    if (!requestForm.message.trim()) { toast.error('Please write a short message'); return }
    setRequestSending(true)
    try {
      const res = await api.post('/api/insurance/request-coverage', {
        preferred_provider: requestForm.preferred_provider,
        coverage_type: requestForm.coverage_type,
        message: requestForm.message,
      })
      if (res.ok) {
        toast.success('Request sent to administrator!')
        setRequestForm({ preferred_provider: 'EFU', coverage_type: 'Comprehensive', message: '' })
      } else {
        toast.error((res as { error?: string }).error || 'Failed to send request')
      }
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed to send') }
    finally { setRequestSending(false) }
  }

  // ── Computed ──────────────────────────────────────────
  const calculateRiskScore = (p: InsurancePolicy) => {
    const f = p.risk_factors; return Math.round((f.fire_risk + f.theft_risk + f.spoilage_risk + f.weather_risk) / 4)
  }
  const totalCoverage = policies.reduce((s, p) => s + p.coverage_amount, 0)
  const totalPremium = policies.reduce((s, p) => s + p.premium_amount, 0)
  const activePolicies = policies.filter(p => p.status === 'active').length
  const avgRisk = policies.length > 0 ? Math.round(policies.reduce((s, p) => s + calculateRiskScore(p), 0) / policies.length) : 0
  const allSpoilageEvents = batches.flatMap(b => (b.spoilage_events || []).map(e => ({ ...e, batch_id: b.batch_id, batch_obj_id: b._id })))
  const statusBadge = (s: string) => ({ active: 'bg-green-100 text-green-800', expired: 'bg-red-100 text-red-800', pending: 'bg-yellow-100 text-yellow-800', cancelled: 'bg-gray-100 text-gray-800' }[s] || 'bg-gray-100 text-gray-800')
  const claimStatusCfg = (s: string) => ({ approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle }, pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock }, rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }, under_review: { color: 'bg-blue-100 text-blue-800', icon: FileText } }[s] || { color: 'bg-yellow-100 text-yellow-800', icon: Clock })

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center"><Shield className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" /><p className="text-gray-500">Loading insurance data...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-600" />
            Insurance & Loss Claim Support
          </h1>
          <p className="text-gray-500 mt-1">Spoilage logging, batch reports, photo documentation & insurer exports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData()} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => { setShowSpoilageModal(true); setSpoilageForm({ batch_id: batches[0]?._id || '', event_type: 'mold', severity: 'medium', description: '', estimated_loss_kg: 0, estimated_value_loss: 0 }); setSpoilagePhotos([]) }} className="gap-2 bg-red-600 hover:bg-red-700"><AlertTriangle className="h-4 w-4" />Log Spoilage</Button>
          <Button onClick={() => openClaimModal()} className="gap-2 bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4" />File Claim</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Policies</CardTitle><Shield className="h-4 w-4 text-green-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{activePolicies}</div><p className="text-xs text-muted-foreground">Coverage: PKR {totalCoverage.toLocaleString()}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Annual Premium</CardTitle><DollarSign className="h-4 w-4 text-blue-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">PKR {totalPremium.toLocaleString()}</div><p className="text-xs text-muted-foreground">Monthly: PKR {Math.round(totalPremium / 12).toLocaleString()}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Claims</CardTitle><FileText className="h-4 w-4 text-amber-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{claims.length}</div><p className="text-xs text-muted-foreground">Approved: PKR {claims.reduce((s, c) => s + c.amount_approved, 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Spoilage Events</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{allSpoilageEvents.length}</div><p className="text-xs text-muted-foreground">Across {batches.filter(b => (b.spoilage_events?.length || 0) > 0).length} batches</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle><AlertTriangle className="h-4 w-4 text-purple-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgRisk}%</div><Progress value={avgRisk} className="h-2 mt-1" /></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap w-full justify-start h-auto lg:inline-flex p-1">
          {isAdmin && <TabsTrigger value="review_queue" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"><Activity className="w-4 h-4 mr-2" />Review Queue</TabsTrigger>}
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spoilage">Spoilage Events</TabsTrigger>
          <TabsTrigger value="claims">Claims & Exports</TabsTrigger>
          <TabsTrigger value="reports">Batch Reports</TabsTrigger>
          <TabsTrigger value="timeline">Event Timeline</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* ── TAB: Review Queue (Super Admin) ──────────────── */}
        {isAdmin && (
          <TabsContent value="review_queue" className="space-y-4">
            <Card className="border-t-4 border-t-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-amber-500" />Super Admin Claim Review Queue</CardTitle>
                <CardDescription>Review, investigate, assess, and process payments for filed claims across all customers.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Claimed Amt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filed Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map(claim => {
                      const cfg = claimStatusCfg(claim.status)
                      const Icon = cfg.icon
                      const policy = policies.find(p => p._id === (typeof claim.policy_id === 'object' ? claim.policy_id?._id : claim.policy_id))
                      return (
                        <TableRow key={claim._id}>
                          <TableCell className="font-medium">{claim.claim_number}</TableCell>
                          <TableCell>{policy?.policy_number || 'Unknown'}</TableCell>
                          <TableCell>{claim.claim_type}</TableCell>
                          <TableCell>PKR {claim.amount_claimed.toLocaleString()}</TableCell>
                          <TableCell><Badge className={cfg.color}><Icon className="h-3 w-3 mr-1" />{claim.status}</Badge></TableCell>
                          <TableCell className="text-xs">{new Date(claim.filed_date || claim.incident_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => { setSelectedClaim(claim); setShowReviewModal(true); setReviewTab('details'); }}>
                              Review Claim
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {claims.length === 0 && <div className="text-center py-12 text-gray-400"><FileText className="h-12 w-12 mx-auto mb-3" /><p>No claims pending review.</p></div>}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── TAB: Overview ──────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map(policy => (
              <Card key={policy._id} className="hover:shadow-lg transition-shadow border-t-4 border-t-amber-400">
                <CardHeader>
                  <div className="flex items-center justify-between"><CardTitle className="text-lg">{policy.policy_number}</CardTitle><Badge className={statusBadge(policy.status)}>{policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}</Badge></div>
                  <CardDescription>{policy.provider_name} • {policy.coverage_type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Coverage</p><p className="font-medium">PKR {policy.coverage_amount.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Premium</p><p className="font-medium">PKR {policy.premium_amount.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Deductible</p><p className="font-medium">PKR {policy.deductible.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Risk</p><p className="font-medium">{calculateRiskScore(policy)}%</p></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>Batches Covered</span><span>{policy.covered_batches.length}</span></div>
                    <Progress value={(policy.covered_batches.length / 5) * 100} className="h-2" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setActiveTab('policies')}><Eye className="h-3 w-3 mr-1" />View Details</Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openClaimModal(policy)}>File Claim</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {policies.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400"><Shield className="h-12 w-12 mx-auto mb-3" /><p>No active policies. Policies are managed by your system administrator.</p></div>}
          </div>
        </TabsContent>

        {/* ── TAB: Spoilage Events ───────────────────────── */}
        <TabsContent value="spoilage" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Spoilage Event Log</CardTitle><CardDescription>All logged spoilage/damage events across batches</CardDescription></div>
                <Button onClick={() => { setShowSpoilageModal(true); setSpoilagePhotos([]) }} className="gap-2 bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4" />Log New Event</Button>
              </div>
            </CardHeader>
            <CardContent>
              {allSpoilageEvents.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><AlertTriangle className="h-12 w-12 mx-auto mb-3" /><p className="text-lg font-medium">No spoilage events logged</p><p className="text-sm mt-1">Use &quot;Log Spoilage&quot; to record damage events</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Event ID</TableHead><TableHead>Batch</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Loss (kg)</TableHead><TableHead>Value Loss</TableHead><TableHead>Date</TableHead><TableHead>Photos</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {allSpoilageEvents.map((evt) => (
                      <TableRow key={evt.event_id}>
                        <TableCell className="font-mono text-xs">{evt.event_id}</TableCell>
                        <TableCell><Badge variant="outline">{evt.batch_id}</Badge></TableCell>
                        <TableCell><span className="flex items-center gap-1">{EVENT_ICONS[evt.event_type] || EVENT_ICONS.other}{evt.event_type}</span></TableCell>
                        <TableCell><Badge variant="outline" className={SEVERITY_COLORS[evt.severity]}>{evt.severity}</Badge></TableCell>
                        <TableCell>{evt.estimated_loss_kg || 0} kg</TableCell>
                        <TableCell>PKR {(evt.estimated_value_loss || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{new Date(evt.detected_date).toLocaleDateString()}</TableCell>
                        <TableCell><span className="flex items-center gap-1"><Camera className="h-3 w-3" />{evt.photos?.length || 0}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Claims & Exports ──────────────────────── */}
        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Insurance Claims</CardTitle><CardDescription>File &amp; manage claims — export in EFU, Adamjee, ZTBL formats</CardDescription></div>
                <Button onClick={() => openClaimModal()} className="gap-2 bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4" />New Claim</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Claim #</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Claimed</TableHead><TableHead>Approved</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Export / Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {claims.map(claim => {
                    const cfg = claimStatusCfg(claim.status); const Icon = cfg.icon
                    return (
                      <TableRow key={claim._id}>
                        <TableCell className="font-medium">{claim.claim_number}</TableCell>
                        <TableCell>{claim.claim_type}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{claim.description}</TableCell>
                        <TableCell>PKR {claim.amount_claimed.toLocaleString()}</TableCell>
                        <TableCell>PKR {claim.amount_approved.toLocaleString()}</TableCell>
                        <TableCell><Badge className={cfg.color}><Icon className="h-3 w-3 mr-1" />{claim.status}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(claim.incident_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedClaim(claim); setShowClaimDetail(true) }}>
                              <Eye className="h-3 w-3 mr-1" />Details
                            </Button>
                            {['efu', 'adamjee', 'ztbl'].map(fmt => (
                              <Button key={fmt} variant="outline" size="sm" onClick={() => downloadInsuranceExport(claim.batch_affected?.batch_id, fmt, claim.claim_number)} disabled={!claim.batch_affected?.batch_id}>
                                <Download className="h-3 w-3" />
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {claims.length === 0 && <div className="text-center py-12 text-gray-400"><FileText className="h-12 w-12 mx-auto mb-3" /><p>No claims filed yet</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Batch Reports ─────────────────────────── */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-500" />Batch-wise PDF Reports</CardTitle><CardDescription>Download traceability &amp; spoilage PDF reports per batch</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Batch ID</TableHead><TableHead>Grain Type</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Spoilage Events</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {batches.map(batch => (
                    <TableRow key={batch._id}>
                      <TableCell className="font-medium">{batch.batch_id}</TableCell>
                      <TableCell>{batch.grain_type}</TableCell>
                      <TableCell>{batch.quantity_kg?.toLocaleString()} kg</TableCell>
                      <TableCell><Badge variant="outline">{batch.status}</Badge></TableCell>
                      <TableCell><Badge variant={batch.spoilage_events?.length ? "destructive" : "secondary"}>{batch.spoilage_events?.length || 0} events</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => downloadBatchReport(batch._id, batch.batch_id)} className="gap-1"><Download className="h-3 w-3" />PDF Report</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {batches.length === 0 && <div className="text-center py-12 text-gray-400"><Package className="h-12 w-12 mx-auto mb-3" /><p>No batches found</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Event Timeline ────────────────────────── */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-purple-500" />Visual Event Timeline</CardTitle>
              <CardDescription>Select a batch to view spoilage events with photos</CardDescription>
              <Select value={selectedBatchForTimeline} onValueChange={setSelectedBatchForTimeline}>
                <SelectTrigger className="w-64 mt-2"><SelectValue placeholder="Select a batch..." /></SelectTrigger>
                <SelectContent>{batches.map(b => <SelectItem key={b._id} value={b._id}>{b.batch_id} — {b.grain_type}</SelectItem>)}</SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!selectedBatchForTimeline ? (
                <div className="text-center py-16 text-gray-400"><Eye className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Select a batch above to view its timeline</p></div>
              ) : timelineEvents.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" /><p className="text-lg font-medium">No spoilage events</p><p className="text-sm">This batch has a clean record</p></div>
              ) : (
                <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-red-400 before:to-amber-300">
                  {timelineEvents.sort((a, b) => new Date(a.detected_date).getTime() - new Date(b.detected_date).getTime()).map((evt, idx) => (
                    <div key={evt.event_id} className="relative">
                      <div className={`absolute -left-8 top-1 w-7 h-7 rounded-full flex items-center justify-center border-2 ${evt.severity === 'critical' ? 'bg-red-100 border-red-400' : evt.severity === 'high' ? 'bg-orange-100 border-orange-400' : evt.severity === 'medium' ? 'bg-yellow-100 border-yellow-400' : 'bg-green-100 border-green-400'}`}>
                        <span className="text-xs font-bold">{idx + 1}</span>
                      </div>
                      <Card className="border-l-4" style={{ borderLeftColor: evt.severity === 'critical' ? '#ef4444' : evt.severity === 'high' ? '#f97316' : evt.severity === 'medium' ? '#eab308' : '#22c55e' }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {EVENT_ICONS[evt.event_type] || EVENT_ICONS.other}
                                <span className="font-semibold capitalize">{evt.event_type}</span>
                                <Badge variant="outline" className={SEVERITY_COLORS[evt.severity]}>{evt.severity}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{evt.description || 'No description'}</p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(evt.detected_date).toLocaleString()}</span>
                                {evt.estimated_loss_kg > 0 && <span>Loss: {evt.estimated_loss_kg} kg</span>}
                                {evt.estimated_value_loss > 0 && <span>Value: PKR {evt.estimated_value_loss.toLocaleString()}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">{evt.event_id}</span>
                          </div>
                          {evt.photos && evt.photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-4 gap-2">
                              {evt.photos.map((photo, pIdx) => (
                                <a key={pIdx} href={photo.path} target="_blank" rel="noopener noreferrer" className="block">
                                  <Image
                                    src={photo.path}
                                    alt={photo.original_name || `Photo ${pIdx + 1}`}
                                    width={100}
                                    height={80}
                                    className="w-full h-20 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: My Policies (Read-Only) ────────────────── */}
        <TabsContent value="policies" className="space-y-4">
          {/* Provider Info Banner */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-800">Your insurance policies are managed by your system administrator. Contact them to add or modify coverage plans from providers like <strong>EFU</strong>, <strong>Adamjee</strong>, or <strong>ZTBL</strong>.</p>
            </CardContent>
          </Card>

          {/* Policy Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map(p => (
              <Card key={p._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.status === 'active' ? 'bg-green-100' : p.status === 'expired' ? 'bg-red-100' : 'bg-gray-100'}`}>
                        <Shield className={`h-5 w-5 ${p.status === 'active' ? 'text-green-600' : p.status === 'expired' ? 'text-red-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{p.provider_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p.policy_number}</p>
                      </div>
                    </div>
                    <Badge className={statusBadge(p.status)}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline" className="text-xs">{p.coverage_type}</Badge>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coverage</p><p className="font-semibold">PKR {p.coverage_amount.toLocaleString()}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Premium</p><p className="font-semibold">PKR {p.premium_amount.toLocaleString()}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deductible</p><p className="font-semibold">PKR {p.deductible.toLocaleString()}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Score</p><div className="flex items-center gap-1"><span className="font-semibold">{calculateRiskScore(p)}%</span><Progress value={calculateRiskScore(p)} className="w-12 h-1.5" /></div></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()}</span>
                    <span>{p.covered_batches.length} batches covered</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openClaimModal(p)}><FileText className="h-3 w-3 mr-1" />File Claim Against This Policy</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {policies.length === 0 && (
            <Card>
              <CardContent className="text-center py-16">
                <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600">No Insurance Policies</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Your administrator has not assigned any insurance policies yet. Use the form below to request coverage.</p>
              </CardContent>
            </Card>
          )}

          {/* Request Insurance Coverage Form */}
          <Card className="border-2 border-dashed border-amber-300 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5 text-amber-600" />Request Insurance Coverage</CardTitle>
              <CardDescription>Send a request to your system administrator to activate a new insurance policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Provider</label>
                  <Select value={requestForm.preferred_provider} onValueChange={v => setRequestForm({ ...requestForm, preferred_provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFU">EFU General Insurance</SelectItem>
                      <SelectItem value="Adamjee">Adamjee Insurance</SelectItem>
                      <SelectItem value="ZTBL">ZTBL (Zarai Taraqiati Bank)</SelectItem>
                      <SelectItem value="Other">Other Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Coverage Type Needed</label>
                  <Select value={requestForm.coverage_type} onValueChange={v => setRequestForm({ ...requestForm, coverage_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                      <SelectItem value="Fire & Theft">Fire & Theft</SelectItem>
                      <SelectItem value="Spoilage Only">Spoilage Only</SelectItem>
                      <SelectItem value="Weather Damage">Weather Damage</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message to Administrator</label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g. I need coverage for 5 wheat batches in Silo A. Estimated total value PKR 2,500,000..."
                  value={requestForm.message}
                  onChange={e => setRequestForm({ ...requestForm, message: e.target.value })}
                />
              </div>
              <Button onClick={sendInsuranceRequest} disabled={requestSending} className="gap-2 bg-amber-600 hover:bg-amber-700">
                <Send className="h-4 w-4" />
                {requestSending ? 'Sending...' : 'Send Request to Admin'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Spoilage Event Modal ──────────────────────────── */}
      <Dialog open={showSpoilageModal} onOpenChange={setShowSpoilageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Log Spoilage Event</DialogTitle><DialogDescription>Record a spoilage or damage event with photos</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Batch *</label><Select value={spoilageForm.batch_id} onValueChange={v => setSpoilageForm({ ...spoilageForm, batch_id: v })}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{batches.map(b => <SelectItem key={b._id} value={b._id}>{b.batch_id} — {b.grain_type}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Event Type</label><Select value={spoilageForm.event_type} onValueChange={v => setSpoilageForm({ ...spoilageForm, event_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['mold', 'pests', 'moisture', 'heat', 'smell', 'contamination', 'other'].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Severity</label><Select value={spoilageForm.severity} onValueChange={v => setSpoilageForm({ ...spoilageForm, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'critical'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Description</label><Input value={spoilageForm.description} onChange={e => setSpoilageForm({ ...spoilageForm, description: e.target.value })} placeholder="Describe what was observed..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Est. Loss (kg)</label><Input type="number" value={spoilageForm.estimated_loss_kg} onChange={e => setSpoilageForm({ ...spoilageForm, estimated_loss_kg: Number(e.target.value) })} /></div>
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Est. Value Loss (PKR)</label><Input type="number" value={spoilageForm.estimated_value_loss} onChange={e => setSpoilageForm({ ...spoilageForm, estimated_value_loss: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Damage Photos</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input type="file" id="spoilage-photos" multiple accept="image/*" className="hidden" onChange={e => setSpoilagePhotos(Array.from(e.target.files || []))} />
                <label htmlFor="spoilage-photos" className="cursor-pointer flex flex-col items-center space-y-1"><Upload className="h-6 w-6 text-gray-400" /><span className="text-sm text-gray-500">Click to upload photos</span></label>
                {spoilagePhotos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{spoilagePhotos.map((f, i) => <div key={i} className="relative"><Image src={URL.createObjectURL(f)} alt="" width={100} height={80} className="w-full h-20 object-cover rounded" /><button type="button" onClick={() => setSpoilagePhotos(spoilagePhotos.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button></div>)}</div>}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowSpoilageModal(false)}>Cancel</Button>
            <Button onClick={submitSpoilageEvent} disabled={spoilageSaving} className="bg-red-600 hover:bg-red-700">{spoilageSaving ? "Saving..." : "Log Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Claim Detail Dialog ─────────────────────────── */}
      <Dialog open={showClaimDetail} onOpenChange={setShowClaimDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  Claim {selectedClaim?.claim_number}
                </DialogTitle>
                <DialogDescription>
                  {selectedClaim?.claim_type} claim filed on {selectedClaim && new Date(selectedClaim.filed_date).toLocaleDateString()}
                </DialogDescription>
              </div>
              <Badge className={selectedClaim ? claimStatusCfg(selectedClaim.status).color : ''}>
                {selectedClaim?.status.toUpperCase().replace('_', ' ')}
              </Badge>
            </div>
          </DialogHeader>

          {selectedClaim && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Left Column: Details & Stepper */}
              <div className="md:col-span-2 space-y-6">
                {/* Stepper */}
                <div className="relative pt-2 pb-8">
                  <div className="flex items-center justify-between w-full">
                    {[
                      { s: 'pending', l: 'Filed', i: FileText },
                      { s: 'under_review', l: 'Review', i: FileSearch },
                      { s: 'investigation', l: 'Investigation', i: Search },
                      { s: 'assessment', l: 'Assessment', i: BarChart3 },
                      { s: 'approved', l: 'Approved', i: CheckCircle },
                      { s: 'settled', l: 'Settled', i: DollarSign }
                    ].map((step, idx, arr) => {
                      const statuses = arr.map(a => a.s)
                      const currentIndex = statuses.indexOf(selectedClaim.status === 'rejected' ? 'pending' : selectedClaim.status)
                      const isCompleted = idx < currentIndex || selectedClaim.status === 'settled' || (selectedClaim.status === 'approved' && idx <= 4)
                      const isActive = idx === currentIndex
                      const Icon = step.i

                      return (
                        <div key={step.s} className="flex flex-col items-center relative z-10">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                            isCompleted ? "bg-green-500 text-white" : isActive ? "bg-amber-500 text-white ring-4 ring-amber-100" : "bg-gray-100 text-gray-400"
                          )}>
                            {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                          </div>
                          <span className={cn("text-[10px] font-bold mt-2 uppercase tracking-tight", isActive ? "text-amber-600" : "text-gray-400")}>
                            {step.l}
                          </span>
                          {idx < arr.length - 1 && (
                            <div className={cn(
                              "absolute top-5 left-1/2 w-full h-[2px] -z-10",
                              isCompleted ? "bg-green-500" : "bg-gray-100"
                            )} style={{ width: 'calc(100% * 2.5)' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Incident Description</p>
                    <p className="text-sm">{selectedClaim.description}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Affected Batch</p>
                    <p className="text-sm font-semibold">{selectedClaim.batch_affected?.batch_id} ({selectedClaim.batch_affected?.grain_type})</p>
                    <p className="text-xs text-gray-500">{selectedClaim.batch_affected?.quantity_affected} kg affected</p>
                  </div>
                </div>

                {/* Status Specific Content */}
                {selectedClaim.status === 'investigation' && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2"><Search className="h-4 w-4" />Investigation in Progress</h4>
                    <p className="text-xs text-blue-600">The claim is currently under investigation by an insurance adjuster. Findings will be posted here once complete.</p>
                  </div>
                )}

                {selectedClaim.investigation?.findings && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <h4 className="text-sm font-bold text-green-800 flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4" />Investigation Findings</h4>
                    <p className="text-sm text-green-700">{selectedClaim.investigation.findings}</p>
                    <div className="flex gap-4 mt-2 text-[10px] text-green-600 font-bold uppercase">
                      <span>Cause: {selectedClaim.investigation.cause_of_loss}</span>
                      <span>Preventable: {selectedClaim.investigation.preventable ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}

                {/* Communication Thread */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />Communication History
                  </h4>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                    {(selectedClaim.communications || []).map((msg, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-xs text-blue-600">User</span>
                          <span className="text-[10px] text-gray-400">{new Date(msg.sent_at).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700">{msg.message}</p>
                      </div>
                    ))}
                    {(!selectedClaim.communications || selectedClaim.communications.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-4">No internal communications yet</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input value={claimNote} onChange={e => setClaimNote(e.target.value)} placeholder="Add a note or message..." className="text-sm" />
                    <Button size="sm" onClick={() => addClaimNote(selectedClaim._id)}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Document Gallery */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Camera className="h-4 w-4" />Damage Evidence & Documents
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedClaim.photos?.map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noreferrer" className="relative h-20 rounded-lg overflow-hidden border group">
                        <Image src={p} alt="Evidence" fill className="object-cover group-hover:scale-110 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Actions & Summary */}
              <div className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">Claim Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-amber-700">Claimed Amount</span>
                      <span className="font-bold text-sm">PKR {selectedClaim.amount_claimed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-amber-700">Approved Amount</span>
                      <span className="font-bold text-sm text-green-600">PKR {selectedClaim.amount_approved.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-amber-200">
                      <p className="text-[10px] text-amber-600 uppercase font-bold mb-1">Policy Holder</p>
                      <p className="text-xs font-medium">GrainHero Customer</p>
                    </div>
                  </div>
                </div>

                {/* Admin Actions Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Administrative Actions</h4>

                  {selectedClaim.status === 'pending' && (
                    <div className="space-y-2">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => updateClaimStatus(selectedClaim._id, 'under_review')} disabled={actionLoading}>
                        <FileSearch className="h-4 w-4" />Start Review
                      </Button>
                      <Button variant="outline" className="w-full text-red-600 hover:bg-red-50 border-red-200" onClick={() => submitClaimReview(selectedClaim._id, false, 'Initial rejection')} disabled={actionLoading}>
                        <XCircle className="h-4 w-4 mr-2" />Reject Claim
                      </Button>
                    </div>
                  )}

                  {selectedClaim.status === 'under_review' && (
                    <div className="space-y-2">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 gap-2" onClick={() => updateClaimStatus(selectedClaim._id, 'investigation')} disabled={actionLoading}>
                        <Search className="h-4 w-4" />Assign Investigator
                      </Button>
                      <Button variant="outline" className="w-full text-green-600 hover:bg-green-50 border-green-200" onClick={() => submitClaimReview(selectedClaim._id, true, 'Approved after review')} disabled={actionLoading}>
                        <CheckCircle className="h-4 w-4 mr-2" />Approve Directly
                      </Button>
                    </div>
                  )}

                  {selectedClaim.status === 'investigation' && (
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
                      onClick={() => submitInvestigation(selectedClaim._id, 'Damaged verified by on-site inspection.', 'Moisture Spoilage')} disabled={actionLoading}>
                      <UserCheck className="h-4 w-4" />Complete Investigation
                    </Button>
                  )}

                  {selectedClaim.status === 'assessment' && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 text-center italic">Awaiting settlement assessment...</p>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                        onClick={() => submitAssessment(selectedClaim._id, selectedClaim.amount_claimed * 0.9, 'Standard spoilage coverage applies.')} disabled={actionLoading}>
                        <BarChart3 className="h-4 w-4" />Finalize Assessment
                      </Button>
                    </div>
                  )}

                  {selectedClaim.status === 'approved' && (
                    <Button className="w-full bg-green-600 hover:bg-green-700 gap-2"
                      onClick={() => processPayment(selectedClaim._id, selectedClaim.amount_approved, 'bank_transfer', 'REF-' + Date.now())} disabled={actionLoading}>
                      <DollarSign className="h-4 w-4" />Process Settlement
                    </Button>
                  )}

                  {selectedClaim.status === 'settled' && (
                    <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-green-800">Claim Settled & Closed</p>
                      <p className="text-[10px] text-green-600 mt-1">Payment: PKR {selectedClaim.payment?.amount.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="h-4 w-4" />Audit Log Preview
                  </h4>
                  <div className="space-y-3 pl-2 border-l border-gray-100">
                    <div className="relative pl-4 pb-4 border-l border-green-200 last:pb-0">
                      <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-green-400" />
                      <p className="text-[10px] font-bold text-gray-800">Claim Filed</p>
                      <p className="text-[9px] text-gray-400">{new Date(selectedClaim.filed_date).toLocaleDateString()}</p>
                    </div>
                    {selectedClaim.review_date && (
                      <div className="relative pl-4 pb-4 border-l border-blue-200 last:pb-0">
                        <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-400" />
                        <p className="text-[10px] font-bold text-gray-800">Initial Review Complete</p>
                        <p className="text-[9px] text-gray-400">{new Date(selectedClaim.review_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Claim Modal (File New) ────────────────────────── */}
      <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>File Insurance Claim</DialogTitle><DialogDescription>Submit a claim with damage evidence</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Policy</label><Select value={claimForm.policy_id} onValueChange={v => setClaimForm({ ...claimForm, policy_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{policies.map(p => <SelectItem key={p._id} value={p._id}>{p.policy_number} • {p.provider_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Claim Type</label><Select value={claimForm.claim_type} onValueChange={v => setClaimForm({ ...claimForm, claim_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Fire', 'Theft', 'Spoilage', 'Weather Damage', 'Equipment Failure', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Incident Date</label><Input type="date" value={claimForm.incident_date} onChange={e => setClaimForm({ ...claimForm, incident_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Description</label><Input value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} placeholder="Describe the incident..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Amount Claimed</label><Input type="number" value={claimForm.amount_claimed} onChange={e => setClaimForm({ ...claimForm, amount_claimed: Number(e.target.value) })} /></div>
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Affected Batch</label><Select value={claimForm.batch_id} onValueChange={v => setClaimForm({ ...claimForm, batch_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{batches.map(b => <SelectItem key={b._id} value={b._id}>{b.batch_id} • {b.grain_type}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Damage Photos *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input type="file" id="claim-photos" multiple accept="image/*" className="hidden" onChange={e => setClaimPhotos(Array.from(e.target.files || []))} />
                <label htmlFor="claim-photos" className="cursor-pointer flex flex-col items-center space-y-1"><Upload className="h-6 w-6 text-gray-400" /><span className="text-sm text-gray-500">Click to upload damage photos</span></label>
                {claimPhotos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{claimPhotos.map((f, i) => <div key={i} className="relative"><Image src={URL.createObjectURL(f)} alt="" width={100} height={96} className="w-full h-24 object-cover rounded" /><button type="button" onClick={() => setClaimPhotos(claimPhotos.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button></div>)}</div>}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setShowClaimModal(false); setClaimPhotos([]) }}>Close</Button>
            <Button onClick={submitClaimWithPhotos} disabled={claimSaving || uploadingPhotos}>{claimSaving || uploadingPhotos ? "Submitting..." : "Submit Claim"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Claim Dialog */}
      {/* ... Existing Claim Modal ... */}

      {/* ── Super Admin Review Claim Modal ────────────────── */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Review Claim: {selectedClaim?.claim_number}
            </DialogTitle>
            <DialogDescription>
              Complete the end-to-end claim lifecycle. Update statuses and record investigation details.
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-6">
              {/* Stepper Header */}
              <div className="flex items-center justify-between border-b pb-4">
                {['Pending', 'Under Review', 'Investigation', 'Assessment', 'Approved', 'Payment Processed'].map((step, idx) => {
                  const statuses = ['Pending', 'Under Review', 'Investigation', 'Assessment', 'Approved', 'Payment Processed', 'Closed'];
                  const currentIndex = statuses.indexOf(selectedClaim.status);
                  const isCompleted = currentIndex > idx;
                  const isActive = currentIndex === idx;

                  return (
                    <div key={step} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-amber-500 text-white ring-4 ring-amber-100' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] font-medium ${isActive ? 'text-amber-700' : isCompleted ? 'text-green-700' : 'text-gray-400'}`}>{step}</span>
                    </div>
                  )
                })}
              </div>

              <Tabs value={reviewTab} onValueChange={setReviewTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details & Docs</TabsTrigger>
                  <TabsTrigger value="investigation">Investigation</TabsTrigger>
                  <TabsTrigger value="assessment">Assessment</TabsTrigger>
                  <TabsTrigger value="payment">Payment & Status</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500">Claim Type</p><p>{selectedClaim.claim_type}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500">Amount Claimed</p><p className="font-bold text-lg text-red-600">PKR {selectedClaim.amount_claimed.toLocaleString()}</p></CardContent></Card>
                    <Card className="col-span-2"><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500">Description</p><p>{selectedClaim.description}</p></CardContent></Card>
                    <Card className="col-span-2"><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500">Affected Batch</p><p>ID: {selectedClaim.batch_affected?.batch_id} • Qty: {selectedClaim.batch_affected?.quantity_affected} kg</p></CardContent></Card>
                  </div>
                </TabsContent>

                <TabsContent value="investigation" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium">Cause of Loss</label>
                        <Select defaultValue={selectedClaim.investigation?.cause_of_loss || ''}>
                          <SelectTrigger><SelectValue placeholder="Select cause..." /></SelectTrigger>
                          <SelectContent><SelectItem value="weather">Weather / Moisture</SelectItem><SelectItem value="pest">Pest Infestation</SelectItem><SelectItem value="fire">Fire</SelectItem><SelectItem value="operational">Operational Error</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Investigation Findings</label>
                        <Input className="mt-1" placeholder="Enter findings..." defaultValue={selectedClaim.investigation?.findings || ''} />
                      </div>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">Save Investigation Details</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="assessment" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Estimated Damage Value (PKR)</label>
                          <Input type="number" defaultValue={selectedClaim.assessment?.estimated_damage_value || selectedClaim.amount_claimed} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Settlement Recommendation (PKR)</label>
                          <Input type="number" defaultValue={selectedClaim.assessment?.settlement_recommendation || 0} />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Internal Notes</label>
                        <Input className="mt-1" placeholder="Admin notes..." defaultValue={selectedClaim.assessment?.internal_notes || ''} />
                      </div>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">Update Assessment</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Approved Amount (PKR)</label>
                          <Input type="number" defaultValue={selectedClaim.amount_approved || 0} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Payment Method</label>
                          <Select defaultValue={selectedClaim.payment?.payment_method || 'bank_transfer'}>
                            <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                            <SelectContent><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700">Approve & Process Payment</Button>
                        <Button variant="destructive" className="flex-1">Reject Claim</Button>
                        <Button variant="outline" className="flex-1">Mark as Closed</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

