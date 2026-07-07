"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Crown, TrendingUp, Users, HardDrive, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanUsage {
  users: { used: number; limit: number | string }
  storage: { used: number; limit: number }
  batches: { used: number; limit: number | string }
  [key: string]: { used: number; limit: number | string }
}

interface PlanDetails {
  name: string
  price: string
  features: string[]
  usage: PlanUsage
  status?: "active" | "trial" | "expired" | "cancelled"
  renewalDate?: string
}

interface PlanStatusCardProps {
  plan: PlanDetails
  showUpgrade?: boolean
  onUpgrade?: () => void
  onViewDetails?: () => void
  className?: string
}

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-200",
  trial: "bg-blue-100 text-blue-800 border-blue-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200"
}

const usageIcons = {
  users: Users,
  storage: HardDrive,
  batches: Package
}

export function PlanStatusCard({ 
  plan, 
  showUpgrade = true,
  onUpgrade,
  onViewDetails,
  className 
}: PlanStatusCardProps) {
  const getUsagePercentage = (used: number, limit: number | string) => {
    if (typeof limit === "string" && limit.toLowerCase().includes("unlimited")) {
      return 75 // Show 75% for unlimited
    }
    if (typeof limit === "number") {
      return Math.min((used / limit) * 100, 100);
    }
    return 0; // Default case if limit is not a number
  }



  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Crown className="h-5 w-5 mr-2" />
            Current Plan: {plan.name}
          </div>
          {plan.status && (
            <Badge className={cn("", statusColors[plan.status])}>
              {plan.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {plan.price}
          {plan.renewalDate && ` • Renews ${plan.renewalDate}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Plan Features */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Plan Features:</h4>
          <div className="grid gap-1">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-center text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="space-y-4 mb-6">
          {Object.entries(plan.usage).map(([key, usage]) => {
            const percentage = getUsagePercentage(usage.used, usage.limit)
            const IconComponent = usageIcons[key as keyof typeof usageIcons]
            
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    {IconComponent && <IconComponent className="h-4 w-4 mr-2 text-muted-foreground" />}
                    <span className="capitalize">{key}</span>
                  </div>
                  <span>
                    {usage.used}
                    {typeof usage.limit === "number" ? `/${usage.limit}` : ` (${usage.limit})`}
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
                {percentage >= 90 && (
                  <p className="text-xs text-red-600">
                    {percentage >= 100 ? "Limit exceeded!" : "Approaching limit"}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {showUpgrade && (
            <Button size="sm" onClick={onUpgrade} className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onViewDetails} className="flex-1">
            View Usage Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
