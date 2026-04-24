"use client"

import * as React from "react"
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

export interface GaugeChartProps {
  value: number
  min?: number
  max?: number
  title?: string
  subtitle?: string
  unit?: string
  thresholds?: {
    low?: { value: number; color: string }
    medium?: { value: number; color: string }
    high?: { value: number; color: string }
  }
  size?: number
  className?: string
  showValue?: boolean
}

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  title,
  subtitle,
  unit = "%",
  thresholds = {
    low: { value: 33, color: "#ef4444" },
    medium: { value: 66, color: "#f59e0b" },
    high: { value: 100, color: "#22c55e" },
  },
  size = 200,
  className,
  showValue = true,
}: GaugeChartProps) {
  const normalizedValue = Math.min(Math.max(value, min), max)
  const percentage = max > min ? ((normalizedValue - min) / (max - min)) * 100 : 0

  // Determine color based on thresholds
  const getColor = (pct: number): string => {
    if (thresholds.low && pct <= thresholds.low.value) {
      return thresholds.low.color
    }
    if (thresholds.medium && pct <= thresholds.medium.value) {
      return thresholds.medium.color
    }
    return thresholds.high?.color || "#22c55e"
  }

  const color = getColor(percentage)

  // Calculate arc angle (180 degrees = semicircle)
  const arcAngle = 180 - (percentage / 100) * 180

  // Background data (full arc)
  const backgroundData = [
    { value: 100, color: "#e5e7eb" },
  ]

  // Value data (partial arc)
  const valueData = [
    { value: percentage, color },
    { value: 100 - percentage, color: "transparent" },
  ]

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {(title || subtitle) && (
        <div className="mb-2 text-center">
          {title && <h4 className="text-sm font-medium text-foreground">{title}</h4>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      
      <div style={{ width: size, height: size / 2 + 40 }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Background arc */}
            <Pie
              data={backgroundData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="#e5e7eb" />
            </Pie>
            
            {/* Value arc */}
            <Pie
              data={valueData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={arcAngle}
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              <Cell fill={color} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {showValue && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <span className="text-2xl font-bold" style={{ color }}>
              {normalizedValue.toFixed(0)}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
          </div>
        )}
      </div>
      
      {/* Threshold labels */}
      <div className="flex justify-between w-full mt-1 px-2 text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

// Multiple Gauge Dashboard Component
export interface GaugeDashboardProps {
  gauges: Array<{
    value: number
    title: string
    subtitle?: string
    unit?: string
    min?: number
    max?: number
    thresholds?: GaugeChartProps["thresholds"]
  }>
  columns?: number
  className?: string
}

export function GaugeDashboard({ gauges, columns = 3, className }: GaugeDashboardProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {gauges.map((gauge, index) => (
        <GaugeChart
          key={index}
          {...gauge}
          size={150}
        />
      ))}
    </div>
  )
}
