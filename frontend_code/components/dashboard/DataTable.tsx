"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Column<T extends Record<string, unknown> = Record<string, unknown>> {
  key: string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  title: string
  description?: string
  data: T[]
  columns: Column<T>[]
  actions?: {
    label: string
    icon?: LucideIcon
    onClick: (row: T) => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    show?: (row: T) => boolean
  }[]
  emptyMessage?: string
  className?: string
}

export function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({ 
  title,
  description,
  data,
  columns,
  actions = [],
  emptyMessage = "No data available",
  className 
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((row, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                {columns.map((column) => (
                  <div key={column.key} className={cn("", column.className)}>
                    {column.render ? 
                      column.render(row[column.key], row) : 
                      <span>
                        {typeof row[column.key] === 'object' && row[column.key] !== null
                          ? JSON.stringify(row[column.key])
                          : String(row[column.key] ?? '')
                        }
                      </span>
                    }
                  </div>
                ))}
              </div>
              {actions.length > 0 && (
                <div className="flex space-x-2">
                  {actions.map((action, actionIndex) => {
                    if (action.show && !action.show(row)) return null
                    
                    const IconComponent = action.icon
                    return (
                      <Button
                        key={actionIndex}
                        size="sm"
                        variant={action.variant || "outline"}
                        onClick={() => action.onClick(row)}
                      >
                        {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
