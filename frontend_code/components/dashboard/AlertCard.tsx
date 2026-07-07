"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Alert {
  id: string | number
  type: "critical" | "warning" | "info" | "success"
  message: string
  time: string
  location?: string
  details?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
}

interface AlertCardProps {
  title: string
  description?: string
  alerts: Alert[]
  showAll?: boolean
  maxItems?: number
  className?: string
}

const alertIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  success: CheckCircle
}

const alertStyles = {
  critical: {
    card: "border-red-200 bg-red-50",
    title: "text-red-800",
    item: "bg-white border-red-200",
    message: "text-red-900",
    details: "text-red-600"
  },
  warning: {
    card: "border-orange-200 bg-orange-50",
    title: "text-orange-800",
    item: "bg-white border-orange-200",
    message: "text-orange-900",
    details: "text-orange-600"
  },
  info: {
    card: "border-blue-200 bg-blue-50",
    title: "text-blue-800",
    item: "bg-white border-blue-200",
    message: "text-blue-900",
    details: "text-blue-600"
  },
  success: {
    card: "border-green-200 bg-green-50",
    title: "text-green-800",
    item: "bg-white border-green-200",
    message: "text-green-900",
    details: "text-green-600"
  }
}

export function AlertCard({ 
  title, 
  description, 
  alerts, 
  showAll = false,
  maxItems = 3,
  className 
}: AlertCardProps) {
  const displayAlerts = showAll ? alerts : alerts.slice(0, maxItems)
  const hasAlerts = alerts.length > 0

  if (!hasAlerts) {
    return null
  }

  // Determine the highest priority alert type for card styling
  const criticalAlerts = alerts.filter(alert => alert.type === "critical")
  const warningAlerts = alerts.filter(alert => alert.type === "warning")
  
  const cardType = criticalAlerts.length > 0 ? "critical" : 
                   warningAlerts.length > 0 ? "warning" : 
                   alerts[0]?.type || "info"

  const styles = alertStyles[cardType]
  const IconComponent = alertIcons[cardType]

  return (
    <Card className={cn(styles.card, className)}>
      <CardHeader>
        <CardTitle className={cn("flex items-center", styles.title)}>
          <IconComponent className="h-5 w-5 mr-2" />
          {title}
          {alerts.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        {description && (
          <CardDescription>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayAlerts.map((alert) => {
            const AlertIcon = alertIcons[alert.type]
            const alertItemStyles = alertStyles[alert.type]
            
            return (
              <div key={alert.id} className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                alertItemStyles.item
              )}>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <AlertIcon className="h-4 w-4" />
                    <p className={cn("font-medium", alertItemStyles.message)}>
                      {alert.message}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    {alert.location && (
                      <span className={cn("text-sm", alertItemStyles.details)}>
                        {alert.location}
                      </span>
                    )}
                    <span className={cn("text-sm", alertItemStyles.details)}>
                      {alert.time}
                    </span>
                  </div>
                  {alert.details && (
                    <p className={cn("text-xs mt-1", alertItemStyles.details)}>
                      {alert.details}
                    </p>
                  )}
                </div>
                {alert.action && (
                  <Button 
                    size="sm" 
                    variant={alert.action.variant || "outline"}
                    onClick={alert.action.onClick}
                  >
                    {alert.action.label}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        {!showAll && alerts.length > maxItems && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View All {alerts.length} Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
