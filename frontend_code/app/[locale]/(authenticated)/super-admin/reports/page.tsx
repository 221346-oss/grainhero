"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Download,
    Calendar,
    Filter,
    Users,
    BarChart,
    Shield,
    Globe
} from "lucide-react"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"

const reportTypes = [
    { id: 'users', title: 'User Activity', description: 'Platform-wide user login and action history', category: 'Usage', icon: Users, format: 'PDF/CSV' },
    { id: 'telemetry', title: 'System Telemetry', description: 'Aggregated sensor data across all silos', category: 'IoT', icon: BarChart, format: 'PDF/XLSX' },
    { id: 'security', title: 'Security Audit', description: 'Access logs and authentication events', category: 'Security', icon: Shield, format: 'PDF' },
    { id: 'revenue', title: 'Financial Summary', description: 'Billing and subscription revenue metrics', category: 'Finance', icon: Globe, format: 'CSV' },
]

export default function SuperAdminReportsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const [generating, setGenerating] = useState<string | null>(null)
    const [format, _setFormat] = useState<string>("pdf")
    const [date, _setDate] = useState<string>("last_30_days")

    const handleGenerateReport = async (reportId: string) => {
        try {
            setGenerating(reportId)
            const res = await api.post<{ success: boolean, message: string }>(`/api/super-admin/reports/generate`, {
                type: reportId,
                format: format,
                dateRange: date
            })

            if (res.ok && res.data?.success) {
                toast.success(res.data.message)
            } else {
                toast.error("Failed to generate report")
            }
        } catch (_error) {
            toast.error("An error occurred generating report")
        } finally {
            setGenerating(null)
        }
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        System Reports
                    </h2>
                    <p className="text-muted-foreground">
                        Generate and download platform-wide reports
                    </p>
                </div>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        Report Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 md:flex md:space-y-0 md:space-x-4">
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Date Range</label>
                        <div className="flex">
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>pick a date range</span>
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Customer Filter (Optional)</label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="All Customers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Customers</SelectItem>
                                <SelectItem value="t1">Green Valley Farms</SelectItem>
                                <SelectItem value="t2">Golden Harvest Co.</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Format</label>
                        <Select defaultValue="pdf">
                            <SelectTrigger>
                                <SelectValue placeholder="Select Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pdf">PDF Document</SelectItem>
                                <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                                <SelectItem value="excel">Excel Workbook</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {reportTypes.map((report) => (
                    <Card key={report.id} className="hover:shadow-md transition-all duration-200">
                        <CardHeader className="flex flex-row items-center space-y-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-4">
                                <report.icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-base">{report.title}</CardTitle>
                                <CardDescription className="mt-1">{report.description}</CardDescription>
                            </div>
                            <Badge variant="secondary" className="ml-2">{report.category}</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between pt-4 border-t mt-2">
                                <span className="text-sm text-gray-500">Format: {report.format}</span>
                                <Button
                                    onClick={() => handleGenerateReport(report.id)}
                                    disabled={generating === report.id}
                                    variant={generating === report.id ? "ghost" : "outline"}
                                    className={generating !== report.id ? "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" : ""}
                                >
                                    {generating === report.id ? (
                                        <>Generating...</>
                                    ) : (
                                        <>
                                            <Download className="mr-2 h-4 w-4" /> Generate
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
