// =============================================================================
// ConstrutorPro - Página de Demonstração de Visualizações Avançadas
// Gauge, Radar e Scatter Charts
// =============================================================================

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  GaugeChart,
  GaugeDashboard,
  RadarChart,
  ProjectPerformanceRadar,
  ResourceAllocationRadar,
  CompetencyRadar,
  ScatterChart,
  MultiScatterChart,
  CorrelationScatter,
} from '@/components/charts'

// =============================================================================
// Dados de Demonstração
// =============================================================================

// Gauge Demo Data
const gaugeDemoData = [
  { title: 'Progresso Físico', value: 72, unit: '%', min: 0, max: 100 },
  { title: 'Orçamento', value: 85, unit: '%', min: 0, max: 100 },
  { title: 'Qualidade', value: 91, unit: '%', min: 0, max: 100 },
  { title: 'Segurança', value: 98, unit: '%', min: 0, max: 100 },
]

// Radar Demo Data - Performance do Projeto
const projectPerformanceData = [
  { category: 'Cronograma', planned: 90, actual: 75 },
  { category: 'Orçamento', planned: 100, actual: 85 },
  { category: 'Qualidade', planned: 95, actual: 92 },
  { category: 'Segurança', planned: 100, actual: 98 },
  { category: 'Documentação', planned: 80, actual: 65 },
  { category: 'Comunicação', planned: 85, actual: 78 },
]

// Radar Demo Data - Alocação de Recursos
const resourceAllocationData = [
  { category: 'Mão de Obra', allocated: 100, used: 78 },
  { category: 'Equipamentos', allocated: 80, used: 65 },
  { category: 'Materiais', allocated: 95, used: 88 },
  { category: 'Financeiro', allocated: 100, used: 92 },
  { category: 'Tempo', allocated: 100, used: 72 },
]

// Radar Demo Data - Competências
const competencyCategories = ['Liderança', 'Comunicação', 'Técnica', 'Gestão', 'Negociação', 'Planejamento']
const competencyValues = [85, 78, 92, 80, 75, 88]

// Scatter Demo Data - Correlação Custo x Tempo
const costTimeCorrelation = [
  { x: 1, y: 85, label: 'Projeto A' },
  { x: 2, y: 92, label: 'Projeto B' },
  { x: 3, y: 78, label: 'Projeto C' },
  { x: 4, y: 95, label: 'Projeto D' },
  { x: 5, y: 88, label: 'Projeto E' },
  { x: 6, y: 72, label: 'Projeto F' },
  { x: 8, y: 98, label: 'Projeto G' },
  { x: 10, y: 105, label: 'Projeto H' },
  { x: 12, y: 110, label: 'Projeto I' },
  { x: 15, y: 125, label: 'Projeto J' },
]

// Multi Scatter Demo Data
const multiScatterSeries = [
  {
    name: 'Residencial',
    data: [
      { x: 1000, y: 150 },
      { x: 1500, y: 220 },
      { x: 2000, y: 290 },
      { x: 2500, y: 360 },
      { x: 3000, y: 430 },
    ],
    color: '#2563eb',
  },
  {
    name: 'Comercial',
    data: [
      { x: 2000, y: 180 },
      { x: 3000, y: 260 },
      { x: 4000, y: 340 },
      { x: 5000, y: 420 },
      { x: 6000, y: 500 },
    ],
    color: '#22c55e',
  },
  {
    name: 'Industrial',
    data: [
      { x: 5000, y: 200 },
      { x: 7000, y: 280 },
      { x: 10000, y: 380 },
      { x: 15000, y: 520 },
      { x: 20000, y: 680 },
    ],
    color: '#f59e0b',
  },
]

// =============================================================================
// Componente Principal
// =============================================================================

export default function VisualizacoesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visualizações Avançadas</h1>
        <p className="text-muted-foreground">
          Demonstração dos tipos de gráficos disponíveis para widgets do dashboard
        </p>
      </div>

      <Tabs defaultValue="gauge" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gauge">Gauge (Medidor)</TabsTrigger>
          <TabsTrigger value="radar">Radar (Aranha)</TabsTrigger>
          <TabsTrigger value="scatter">Scatter (Dispersão)</TabsTrigger>
        </TabsList>

        {/* Gauge Tab */}
        <TabsContent value="gauge" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Single Gauge */}
            <Card>
              <CardHeader>
                <CardTitle>Gauge Individual</CardTitle>
                <CardDescription>
                  Medidor circular para indicadores de performance com thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <GaugeChart
                  value={75}
                  min={0}
                  max={100}
                  title="Progresso do Projeto"
                  subtitle="Construção Residencial ABC"
                  unit="%"
                  thresholds={{
                    low: { value: 33, color: '#ef4444' },
                    medium: { value: 66, color: '#f59e0b' },
                    high: { value: 100, color: '#22c55e' },
                  }}
                  size={250}
                />
              </CardContent>
            </Card>

            {/* Gauge Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle>Dashboard de Gauges</CardTitle>
                <CardDescription>
                  Múltiplos medidores para visão consolidada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GaugeDashboard gauges={gaugeDemoData} columns={2} />
              </CardContent>
            </Card>

            {/* Gauge Variants */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Variações de Threshold</CardTitle>
                <CardDescription>
                  Diferentes configurações de cores e limites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-8 md:grid-cols-4">
                  <div className="flex flex-col items-center">
                    <GaugeChart
                      value={25}
                      title="Zona de Perigo"
                      unit="%"
                      thresholds={{
                        low: { value: 50, color: '#ef4444' },
                        medium: { value: 75, color: '#f59e0b' },
                        high: { value: 100, color: '#22c55e' },
                      }}
                      size={150}
                    />
                    <Badge variant="destructive" className="mt-2">Crítico</Badge>
                  </div>
                  <div className="flex flex-col items-center">
                    <GaugeChart
                      value={55}
                      title="Zona de Alerta"
                      unit="%"
                      thresholds={{
                        low: { value: 50, color: '#ef4444' },
                        medium: { value: 75, color: '#f59e0b' },
                        high: { value: 100, color: '#22c55e' },
                      }}
                      size={150}
                    />
                    <Badge variant="secondary" className="mt-2">Atenção</Badge>
                  </div>
                  <div className="flex flex-col items-center">
                    <GaugeChart
                      value={80}
                      title="Zona Normal"
                      unit="%"
                      thresholds={{
                        low: { value: 50, color: '#ef4444' },
                        medium: { value: 75, color: '#f59e0b' },
                        high: { value: 100, color: '#22c55e' },
                      }}
                      size={150}
                    />
                    <Badge variant="default" className="mt-2 bg-green-600">Normal</Badge>
                  </div>
                  <div className="flex flex-col items-center">
                    <GaugeChart
                      value={95}
                      title="Zona Excelente"
                      unit="%"
                      thresholds={{
                        low: { value: 50, color: '#ef4444' },
                        medium: { value: 75, color: '#f59e0b' },
                        high: { value: 100, color: '#22c55e' },
                      }}
                      size={150}
                    />
                    <Badge variant="default" className="mt-2 bg-blue-600">Excelente</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Radar Tab */}
        <TabsContent value="radar" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Project Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance do Projeto</CardTitle>
                <CardDescription>
                  Comparativo planejado vs realizado em múltiplas dimensões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectPerformanceRadar data={projectPerformanceData} />
              </CardContent>
            </Card>

            {/* Resource Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Alocação de Recursos</CardTitle>
                <CardDescription>
                  Recursos alocados vs utilizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResourceAllocationRadar data={resourceAllocationData} />
              </CardContent>
            </Card>

            {/* Competency Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Matriz de Competências</CardTitle>
                <CardDescription>
                  Avaliação de competências da equipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompetencyRadar
                  categories={competencyCategories}
                  values={competencyValues}
                  title="Perfil da Equipe"
                />
              </CardContent>
            </Card>

            {/* Custom Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Radar Customizado</CardTitle>
                <CardDescription>
                  Múltiplas séries para análise comparativa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChart
                  data={[
                    { category: 'Jan', projetoA: 80, projetoB: 65, projetoC: 72 },
                    { category: 'Fev', projetoA: 85, projetoB: 70, projetoC: 78 },
                    { category: 'Mar', projetoA: 78, projetoB: 75, projetoC: 82 },
                    { category: 'Abr', projetoA: 90, projetoB: 82, projetoC: 85 },
                    { category: 'Mai', projetoA: 88, projetoB: 88, projetoC: 90 },
                    { category: 'Jun', projetoA: 92, projetoB: 90, projetoC: 88 },
                  ]}
                  dataKeys={[
                    { key: 'projetoA', label: 'Projeto A', color: '#2563eb' },
                    { key: 'projetoB', label: 'Projeto B', color: '#22c55e' },
                    { key: 'projetoC', label: 'Projeto C', color: '#f59e0b' },
                  ]}
                  title="Evolução Mensal"
                  fillOpacity={0.2}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scatter Tab */}
        <TabsContent value="scatter" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Correlation Scatter */}
            <Card>
              <CardHeader>
                <CardTitle>Correlação Custo x Tempo</CardTitle>
                <CardDescription>
                  Análise de correlação entre duração e custo de projetos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CorrelationScatter
                  data={costTimeCorrelation}
                  xLabel="Duração (meses)"
                  yLabel="Custo (R$ mil)"
                />
              </CardContent>
            </Card>

            {/* Simple Scatter */}
            <Card>
              <CardHeader>
                <CardTitle>Dispersão Simples</CardTitle>
                <CardDescription>
                  Distribuição de pontos para análise de tendências
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScatterChart
                  data={[
                    { x: 100, y: 200 },
                    { x: 120, y: 250 },
                    { x: 150, y: 280 },
                    { x: 180, y: 320 },
                    { x: 200, y: 380 },
                    { x: 250, y: 450 },
                    { x: 300, y: 520 },
                    { x: 350, y: 600 },
                    { x: 400, y: 680 },
                    { x: 450, y: 750 },
                  ]}
                  xAxisLabel="Área (m²)"
                  yAxisLabel="Valor (R$ mil)"
                  title="Área vs Valor"
                  showRegressionLine={true}
                  color="#2563eb"
                />
              </CardContent>
            </Card>

            {/* Multi-Series Scatter */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Comparativo por Tipo de Obra</CardTitle>
                <CardDescription>
                  Múltiplas séries para análise comparativa entre categorias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultiScatterChart
                  series={multiScatterSeries}
                  xAxisLabel="Área Total (m²)"
                  yAxisLabel="Duração (dias)"
                  title="Área vs Duração por Tipo de Obra"
                  height={400}
                />
              </CardContent>
            </Card>

            {/* Color-coded Scatter */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Dispersão com Cores por Status</CardTitle>
                <CardDescription>
                  Pontos coloridos por categoria para identificação visual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScatterChart
                  data={[
                    { x: 10, y: 50, label: 'Projeto 1' },
                    { x: 20, y: 75, label: 'Projeto 2' },
                    { x: 30, y: 60, label: 'Projeto 3' },
                    { x: 40, y: 90, label: 'Projeto 4' },
                    { x: 50, y: 85, label: 'Projeto 5' },
                    { x: 60, y: 95, label: 'Projeto 6' },
                    { x: 70, y: 70, label: 'Projeto 7' },
                    { x: 80, y: 88, label: 'Projeto 8' },
                    { x: 90, y: 92, label: 'Projeto 9' },
                    { x: 100, y: 98, label: 'Projeto 10' },
                  ]}
                  xAxisLabel="Progresso Físico (%)"
                  yAxisLabel="Satisfação do Cliente (%)"
                  title="Correlação Progresso vs Satisfação"
                  colors={[
                    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
                  ]}
                  showRegressionLine={true}
                  height={350}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
