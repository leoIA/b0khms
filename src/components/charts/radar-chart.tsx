"use client"

import * as React from "react"
import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"

export interface RadarChartData {
  category: string
  [key: string]: string | number
}

export interface RadarChartProps {
  data: RadarChartData[]
  dataKeys: Array<{
    key: string
    label?: string
    color?: string
  }>
  angleKey?: string
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  fillOpacity?: number
  height?: number
  className?: string
  title?: string
  subtitle?: string
}

const DEFAULT_COLORS = [
  "#2563eb", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
]

export function RadarChart({
  data,
  dataKeys,
  angleKey = "category",
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  fillOpacity = 0.3,
  height = 300,
  className,
  title,
  subtitle,
}: RadarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      {(title || subtitle) && (
        <div className="mb-4 text-center">
          {title && <h4 className="text-sm font-medium text-foreground">{title}</h4>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          {showGrid && <PolarGrid stroke="#e5e7eb" />}
          <PolarAngleAxis
            dataKey={angleKey}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <PolarRadiusAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickCount={5}
          />
          
          {dataKeys.map((dataKey, index) => (
            <Radar
              key={dataKey.key}
              name={dataKey.label || dataKey.key}
              dataKey={dataKey.key}
              stroke={dataKey.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              fill={dataKey.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              fillOpacity={fillOpacity}
              strokeWidth={2}
            />
          ))}
          
          {showTooltip && <Tooltip />}
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="circle"
            />
          )}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Preset Radar Charts for common use cases
export interface ProjectPerformanceRadarProps {
  data: Array<{
    category: string
    planned: number
    actual: number
  }>
  className?: string
}

export function ProjectPerformanceRadar({ data, className }: ProjectPerformanceRadarProps) {
  return (
    <RadarChart
      data={data}
      dataKeys={[
        { key: "planned", label: "Planejado", color: "#2563eb" },
        { key: "actual", label: "Realizado", color: "#22c55e" },
      ]}
      title="Desempenho do Projeto"
      className={className}
    />
  )
}

export interface ResourceAllocationRadarProps {
  data: Array<{
    category: string
    allocated: number
    used: number
  }>
  className?: string
}

export function ResourceAllocationRadar({ data, className }: ResourceAllocationRadarProps) {
  return (
    <RadarChart
      data={data}
      dataKeys={[
        { key: "allocated", label: "Alocado", color: "#f59e0b" },
        { key: "used", label: "Utilizado", color: "#8b5cf6" },
      ]}
      title="Alocação de Recursos"
      className={className}
    />
  )
}

// Skill/Competency Matrix Radar
export interface CompetencyRadarProps {
  categories: string[]
  values: number[]
  title?: string
  className?: string
}

export function CompetencyRadar({ categories, values, title, className }: CompetencyRadarProps) {
  const data = categories.map((category, index) => ({
    category,
    value: values[index] || 0,
  }))

  return (
    <RadarChart
      data={data}
      dataKeys={[{ key: "value", label: "Nível", color: "#06b6d4" }]}
      title={title || "Matriz de Competências"}
      fillOpacity={0.5}
      className={className}
    />
  )
}
