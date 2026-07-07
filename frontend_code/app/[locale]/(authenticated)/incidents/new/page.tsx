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

export default function NewIncidentPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const { t, currentLanguage } = useLanguage();
  const { plan } = usePlan();
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    incidentType: "",
    incidentDate: "",
    reportedBy: "",
    affectedAnimals: "",
    incidentDescription: "",
    actionsTaken: "",
    preventiveMeasures: "",
    incidentStatus: "Under Investigation",
    severity: "Minor",
    cost: "",
    followUpDate: "",
    notes: "",
  })

  useEffect(() => {
    const path = '/incidents/new';
    if (!allowedPages[plan as keyof typeof allowedPages]?.includes(path)) {
      router.replace('/not-allowed');
    } else {
      setLoadingPlan(false);
    }
  }, [plan, router]);

  if (loadingPlan) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const typeOptions = ["Injury", "Illness", "Equipment", "Security", "Weather", "Other"]
  const statusOptions = ["Resolved", "In Progress", "Under Investigation", "Pending"]
  const severityOptions = ["Minor", "Major", "Critical"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${config.backendUrl}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        toast.success(t('recordAdded'))
        router.push(`/${currentLanguage}/incidents`)
      } else {
        const error = await res.json().catch(() => ({}))
        toast.error(error?.message || 'Failed to create incident record')
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
        <Link href={`/${currentLanguage}/incidents`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backTo")} {t("incidents")}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("addIncident")}</h1>
          <p className="text-gray-600">{t("incidentInformation")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("incidentInformation")}</CardTitle>
          <CardDescription>Fill in all the required information for the incident record</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="incidentType">{t("incidentType")} *</Label>
                  <Select value={formData.incidentType} onValueChange={(value) => handleChange("incidentType", value)}>
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
                  <Label htmlFor="incidentDate">{t("incidentDate")} *</Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) => handleChange("incidentDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedBy">{t("reportedBy")} *</Label>
                  <Input
                    id="reportedBy"
                    value={formData.reportedBy}
                    onChange={(e) => handleChange("reportedBy", e.target.value)}
                    placeholder="Farm Manager"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="affectedAnimals">{t("affectedAnimals")}</Label>
                  <Input
                    id="affectedAnimals"
                    value={formData.affectedAnimals}
                    onChange={(e) => handleChange("affectedAnimals", e.target.value)}
                    placeholder="G001, G002 (comma separated)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">Severity *</Label>
                  <Select value={formData.severity} onValueChange={(value) => handleChange("severity", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {severity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incidentStatus">{t("incidentStatus")} *</Label>
                  <Select
                    value={formData.incidentStatus}
                    onValueChange={(value) => handleChange("incidentStatus", value)}
                  >
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

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="cost">{t("cost")}</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleChange("cost", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followUpDate">Follow-up Date</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => handleChange("followUpDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionsTaken">{t("actionsTaken")}</Label>
                  <Textarea
                    id="actionsTaken"
                    value={formData.actionsTaken}
                    onChange={(e) => handleChange("actionsTaken", e.target.value)}
                    placeholder="Describe actions taken to address the incident..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preventiveMeasures">{t("preventiveMeasures")}</Label>
                  <Textarea
                    id="preventiveMeasures"
                    value={formData.preventiveMeasures}
                    onChange={(e) => handleChange("preventiveMeasures", e.target.value)}
                    placeholder="Describe preventive measures to avoid similar incidents..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="incidentDescription">{t("incidentDescription")} *</Label>
              <Textarea
                id="incidentDescription"
                value={formData.incidentDescription}
                onChange={(e) => handleChange("incidentDescription", e.target.value)}
                placeholder="Detailed description of the incident..."
                rows={4}
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
              <Link href={`/${currentLanguage}/incidents`}>
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
