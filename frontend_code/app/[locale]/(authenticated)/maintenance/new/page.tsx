"use client"

import type React from "react"
import { useEffect } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/app/[locale]/providers"
import { toast } from "sonner"
import { config } from "@/config"
import { usePlan } from '@/app/[locale]/providers';
import allowedPages from '../../../allowed-pages.js';

export default function NewMaintenanceRecordPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const { t, currentLanguage } = useLanguage();
  const { plan } = usePlan();
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    maintenanceType: "",
    equipmentId: "",
    maintenanceDate: "",
    performedBy: "",
    description: "",
    partsUsed: "",
    laborHours: "",
    totalCost: "",
    nextMaintenanceDate: "",
    status: "Scheduled",
    priority: "Routine",
    notes: "",
  })

  useEffect(() => {
    const path = '/maintenance/new';
    if (!allowedPages[plan as keyof typeof allowedPages]?.includes(path)) {
      router.replace('/not-allowed');
    } else {
      setLoadingPlan(false);
    }
  }, [plan, router]);

  if (loadingPlan) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const typeOptions = ["Equipment Maintenance", "Facility Maintenance", "Fencing Repair", "Feeding System Maintenance"]
  const statusOptions = ["Completed", "Scheduled", "In Progress"]
  const priorityOptions = ["High", "Medium", "Routine"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${config.backendUrl}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        toast.success(t('recordAdded'))
        router.push(`/${currentLanguage}/maintenance`)
      } else {
        const error = await res.json().catch(() => ({}))
        toast.error(error?.message || 'Failed to create maintenance record')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/${currentLanguage}/maintenance`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backTo")} {t("maintenance")}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("addMaintenanceRecord")}</h1>
          <p className="text-gray-600">{t("maintenanceInformation")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("maintenanceInformation")}</CardTitle>
          <CardDescription>Fill in all the required information for the maintenance record</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceType">{t("maintenanceType")} *</Label>
                  <Select
                    value={formData.maintenanceType}
                    onValueChange={(value) => handleChange("maintenanceType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectOption")} />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipmentId">{t("equipmentId")} *</Label>
                  <Input
                    id="equipmentId"
                    value={formData.equipmentId}
                    onChange={(e) => handleChange("equipmentId", e.target.value)}
                    placeholder="FEEDER-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceDate">{t("maintenanceDate")} *</Label>
                  <Input
                    id="maintenanceDate"
                    type="date"
                    value={formData.maintenanceDate}
                    onChange={(e) => handleChange("maintenanceDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="performedBy">{t("performedBy")}</Label>
                  <Input
                    id="performedBy"
                    value={formData.performedBy}
                    onChange={(e) => handleChange("performedBy", e.target.value)}
                    placeholder="John Smith"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">{t("status")} *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cost and Time Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Cost & Time Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="laborHours">{t("laborHours")}</Label>
                  <Input
                    id="laborHours"
                    type="number"
                    step="0.5"
                    value={formData.laborHours}
                    onChange={(e) => handleChange("laborHours", e.target.value)}
                    placeholder="2.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalCost">{t("totalCost")}</Label>
                  <Input
                    id="totalCost"
                    type="number"
                    step="0.01"
                    value={formData.totalCost}
                    onChange={(e) => handleChange("totalCost", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextMaintenanceDate">{t("nextMaintenanceDate")}</Label>
                  <Input
                    id="nextMaintenanceDate"
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={(e) => handleChange("nextMaintenanceDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partsUsed">{t("partsUsed")}</Label>
                  <Textarea
                    id="partsUsed"
                    value={formData.partsUsed}
                    onChange={(e) => handleChange("partsUsed", e.target.value)}
                    placeholder="List of parts and materials used..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("description")} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Detailed description of maintenance work performed..."
                rows={3}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/${currentLanguage}/maintenance`}>
                <Button variant="outline">{t("cancel")}</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
