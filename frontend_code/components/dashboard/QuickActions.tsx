"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LucideIcon, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickAction {
  id: string
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  disabled?: boolean
  description?: string
}

interface QuickActionsProps {
  title?: string
  description?: string
  actions: QuickAction[]
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}

export function QuickActions({ 
  title = "Quick Actions",
  description = "Common tasks and operations",
  actions,
  columns = 3,
  className 
}: QuickActionsProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6"
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-4", gridCols[columns])}>
          {actions.map((action) => {
            const IconComponent = action.icon
            return (
              <Button
                key={action.id}
                className="h-20 flex flex-col items-center justify-center space-y-2"
                variant={action.variant || "outline"}
                onClick={action.onClick}
                disabled={action.disabled}
                title={action.description}
              >
                <IconComponent className="h-6 w-6" />
                <span className="text-sm">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
