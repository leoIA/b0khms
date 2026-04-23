"use client"

import * as React from "react"
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
  Cell,
} from "recharts"
import { cn } from "@/lib/utils"

export interface ScatterDataPoint {
  x: number
  y: number
  z?: number
  label?: string
  color?: string
}

export interface ScatterChartProps {
  data: ScatterDataPoint[]
  xAxisLabel?: string
  yAxisLabel?: string
  xAxisKey?: string
  yAxisKey?: string
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  height?: number
  className?: string
  title?: string
  subtitle?: string
  color?: string
  showRegressionLine?: boolean
  colors?: string[]
}

const DEFAULT_COLORS = [
  "#2563eb", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
]

// Calculate linear regression
function calculateRegression(data: ScatterDataPoint[]): { slope: number; intercept: number } {
  const n = data.length
  if (n < 2) return { slope: 0, intercept: 0 }

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (const point of data) {
    sumX += point.x
    sumY += point.y
    sumXY += point.x * point.y
    sumX2 += point.x * point.x
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

export function ScatterChart({
  data,
  xAxisLabel = "X",
  yAxisLabel = "Y",
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  height = 300,
  className,
  title,
  subtitle,
  color = "#2563eb",
  colors,
  showRegressionLine = false,
}: ScatterChartProps) {
  // Calculate regression line if needed
  const regression = React.useMemo(() => {
    if (!showRegressionLine || data.length < 2) return null
    
    const { slope, intercept } = calculateRegression(data)
    const minX = Math.min(...data.map(d => d.x))
    const maxX = Math.max(...data.map(d => d.x))
    
    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
    ]
  }, [data, showRegressionLine])

  return (
    <div className={cn("w-full", className)}>
      {(title || subtitle) && (
        <div className="mb-4 text-center">
          {title && <h4 className="text-sm font-medium text-foreground">{title}</h4>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis
            type="number"
            dataKey="x"
            name={xAxisLabel}
            tick={{ fontSize: 11, fill: "#64748b" }}
            label={{ value: xAxisLabel, position: "bottom", fontSize: 11, fill: "#94a3b8" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yAxisLabel}
            tick={{ fontSize: 11, fill: "#64748b" }}
            label={{ value: yAxisLabel, angle: -90, position: "left", fontSize: 11, fill: "#94a3b8" }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} />
          
          {showTooltip && (
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name === "x" ? xAxisLabel : yAxisLabel,
              ]}
            />
          )}
          
          <Scatter
            name="Dados"
            data={data}
            fill={color}
          >
            {colors && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length] || color} />
            ))}
          </Scatter>
          
          {showLegend && <Legend />}
        </RechartsScatterChart>
      </ResponsiveContainer>
      
      {regression && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Linha de tendência calculada
        </div>
      )}
    </div>
  )
}

// Multi-series Scatter Chart
export interface MultiScatterChartProps {
  series: Array<{
    name: string
    data: ScatterDataPoint[]
    color?: string
  }>
  xAxisLabel?: string
  yAxisLabel?: string
  showGrid?: boolean
  showLegend?: boolean
  height?: number
  className?: string
  title?: string
  subtitle?: string
}

export function MultiScatterChart({
  series,
  xAxisLabel = "X",
  yAxisLabel = "Y",
  showGrid = true,
  showLegend = true,
  height = 300,
  className,
  title,
  subtitle,
}: MultiScatterChartProps) {
  return (
    <div className={cn("w-full", className)}>
      {(title || subtitle) && (
        <div className="mb-4 text-center">
          {title && <h4 className="text-sm font-medium text-foreground">{title}</h4>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis
            type="number"
            dataKey="x"
            tick={{ fontSize: 11, fill: "#64748b" }}
            label={{ value: xAxisLabel, position: "bottom", fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            tick={{ fontSize: 11, fill: "#64748b" }}
            label={{ value: yAxisLabel, angle: -90, position: "left", fontSize: 11 }}
          />
          <ZAxis type="number" range={[50, 400]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          
          {series.map((s, index) => (
            <Scatter
              key={s.name}
              name={s.name}
              data={s.data}
              fill={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
          
          {showLegend && <Legend />}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// Correlation Scatter Chart with trend line
export interface CorrelationScatterProps {
  data: ScatterDataPoint[]
  xLabel: string
  yLabel: string
  showCorrelation?: boolean
  className?: string
}

export function CorrelationScatter({
  data,
  xLabel,
  yLabel,
  showCorrelation = true,
  className,
}: CorrelationScatterProps) {
  // Calculate Pearson correlation coefficient
  const correlation = React.useMemo(() => {
    if (data.length < 2) return 0
    
    const n = data.length
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0
    let sumY2 = 0
    
    for (const point of data) {
      sumX += point.x
      sumY += point.y
      sumXY += point.x * point.y
      sumX2 += point.x * point.x
      sumY2 += point.y * point.y
    }
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    return denominator !== 0 ? numerator / denominator : 0
  }, [data])

  return (
    <div className={className}>
      <ScatterChart
        data={data}
        xAxisLabel={xLabel}
        yAxisLabel={yLabel}
        title={`Correlação: ${xLabel} vs ${yLabel}`}
        showRegressionLine={true}
      />
      
      {showCorrelation && (
        <div className="mt-2 text-center text-sm">
          <span className="text-muted-foreground">Coeficiente de Correlação (r): </span>
          <span className={cn(
            "font-medium",
            Math.abs(correlation) > 0.7 ? "text-green-600" : 
            Math.abs(correlation) > 0.4 ? "text-amber-600" : "text-red-600"
          )}>
            {correlation.toFixed(3)}
          </span>
          <span className="text-muted-foreground ml-2">
            ({Math.abs(correlation) > 0.7 ? "Forte" : Math.abs(correlation) > 0.4 ? "Moderada" : "Fraca"})
          </span>
        </div>
      )}
    </div>
  )
}
