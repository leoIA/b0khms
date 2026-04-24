"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  TrendingUp, Calculator, FileText, Calendar, 
  Percent, RefreshCw, Plus, Info, AlertTriangle,
  CheckCircle2, History
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// =============================================================================
// Types
// =============================================================================

interface PriceIndex {
  id: string
  type: 'INCC' | 'IGPM' | 'IPCA' | 'INPC' | 'IPC' | 'CUSTOM'
  name: string
  month: number
  year: number
  value: number
  accumulated: number
  source?: string
  publishedAt: Date
}

interface Budget {
  id: string
  name: string
  projectName: string
  totalValue: number
  createdAt: Date
  updatedAt: Date
}

interface PriceAdjustment {
  id: string
  budgetId: string
  budgetName: string
  indexType: string
  baseDate: Date
  targetDate: Date
  factor: number
  originalValue: number
  adjustedValue: number
  appliedAt: Date
}

// =============================================================================
// Index Information
// =============================================================================

const INDEX_INFO = {
  INCC: {
    name: 'INCC - Índice Nacional de Custo da Construção',
    description: 'Mede a variação dos custos de construção civil',
    source: 'FGV/IBGE',
  },
  IGPM: {
    name: 'IGP-M - Índice Geral de Preços do Mercado',
    description: 'Índice amplo de preços',
    source: 'FGV',
  },
  IPCA: {
    name: 'IPCA - Índice Nacional de Preços ao Consumidor Amplo',
    description: 'Índice oficial de inflação do Brasil',
    source: 'IBGE',
  },
  INPC: {
    name: 'INPC - Índice Nacional de Preços ao Consumidor',
    description: 'Índice de preços ao consumidor',
    source: 'IBGE',
  },
  IPC: {
    name: 'IPC - Índice de Preços ao Consumidor',
    description: 'Índice de preços ao consumidor (regional)',
    source: 'FGV',
  },
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

// =============================================================================
// Main Component
// =============================================================================

export default function ReajustePrecosPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [indices, setIndices] = useState<PriceIndex[]>([])
  const [adjustments, setAdjustments] = useState<PriceAdjustment[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false)
  const [showIndexDialog, setShowIndexDialog] = useState(false)
  const [previewResult, setPreviewResult] = useState<any>(null)
  
  // Adjustment form
  const [adjustmentForm, setAdjustmentForm] = useState({
    budgetId: "",
    indexType: "INCC" as 'INCC' | 'IGPM' | 'IPCA' | 'INPC' | 'IPC',
    baseMonth: 1,
    baseYear: new Date().getFullYear() - 1,
    targetMonth: new Date().getMonth() + 1,
    targetYear: new Date().getFullYear(),
    adjustmentType: "proportional" as 'proportional' | 'accumulated' | 'custom',
    customFactor: 0,
  })

  // New index form
  const [newIndex, setNewIndex] = useState({
    type: "INCC" as 'INCC' | 'IGPM' | 'IPCA' | 'INPC' | 'IPC',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    value: 0,
    accumulated: 0,
    source: "",
  })

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [indicesRes, budgetsRes, adjustmentsRes] = await Promise.all([
        fetch('/api/reajuste-precos/indices'),
        fetch('/api/orcamentos?limit=100'),
        fetch('/api/reajuste-precos/historico'),
      ])
      
      if (indicesRes.ok) {
        const data = await indicesRes.json()
        setIndices(data.indices || [])
      }
      if (budgetsRes.ok) {
        const data = await budgetsRes.json()
        setBudgets(data.budgets || data.data || [])
      }
      if (adjustmentsRes.ok) {
        const data = await adjustmentsRes.json()
        setAdjustments(data.adjustments || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Calculate preview
  const handlePreview = async () => {
    if (!adjustmentForm.budgetId) {
      toast({
        title: "Erro",
        description: "Selecione um orçamento.",
        variant: "destructive",
      })
      return
    }
    
    try {
      const response = await fetch('/api/reajuste-precos/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adjustmentForm,
          baseDate: new Date(adjustmentForm.baseYear, adjustmentForm.baseMonth - 1, 1),
          targetDate: new Date(adjustmentForm.targetYear, adjustmentForm.targetMonth - 1, 1),
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setPreviewResult(result)
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao calcular preview.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao calcular preview.",
        variant: "destructive",
      })
    }
  }

  // Apply adjustment
  const handleApplyAdjustment = async () => {
    if (!previewResult) return
    
    try {
      const response = await fetch('/api/reajuste-precos/aplicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adjustmentForm,
          baseDate: new Date(adjustmentForm.baseYear, adjustmentForm.baseMonth - 1, 1),
          targetDate: new Date(adjustmentForm.targetYear, adjustmentForm.targetMonth - 1, 1),
        }),
      })
      
      if (response.ok) {
        toast({
          title: "Reajuste aplicado",
          description: `Orçamento reajustado em ${formatPercentage(previewResult.factor)}.`,
        })
        setShowAdjustmentDialog(false)
        setPreviewResult(null)
        loadData()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao aplicar reajuste.",
        variant: "destructive",
      })
    }
  }

  // Add new index
  const handleAddIndex = async () => {
    try {
      const response = await fetch('/api/reajuste-precos/indices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIndex),
      })
      
      if (response.ok) {
        toast({
          title: "Índice adicionado",
          description: `${INDEX_INFO[newIndex.type].name} - ${MONTHS[newIndex.month - 1]}/${newIndex.year}`,
        })
        setShowIndexDialog(false)
        setNewIndex({
          type: "INCC",
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          value: 0,
          accumulated: 0,
          source: "",
        })
        loadData()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar índice.",
        variant: "destructive",
      })
    }
  }

  // Format helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatPercentage = (factor: number) => {
    const percentage = (factor - 1) * 100
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Get indices by type
  const getIndicesByType = (type: string) => {
    return indices
      .filter(i => i.type === type)
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .slice(0, 12)
  }

  // Get latest accumulated value
  const getLatestAccumulated = (type: string) => {
    const latest = indices
      .filter(i => i.type === type)
      .sort((a, b) => b.year - a.year || b.month - a.month)[0]
    return latest?.accumulated || 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reajuste de Preços</h1>
          <p className="text-muted-foreground">
            Aplique reajustes por índices oficiais (INCC, IGP-M, IPCA)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={showIndexDialog} onOpenChange={setShowIndexDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Novo Índice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Índice</DialogTitle>
                <DialogDescription>
                  Cadastre um novo valor de índice oficial
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Índice</Label>
                    <Select
                      value={newIndex.type}
                      onValueChange={(value: any) => setNewIndex({ ...newIndex, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INDEX_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte</Label>
                    <Input
                      value={newIndex.source}
                      onChange={(e) => setNewIndex({ ...newIndex, source: e.target.value })}
                      placeholder="Ex: IBGE"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mês</Label>
                    <Select
                      value={newIndex.month.toString()}
                      onValueChange={(value) => setNewIndex({ ...newIndex, month: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      value={newIndex.year}
                      onChange={(e) => setNewIndex({ ...newIndex, year: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Variação Mensal (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newIndex.value}
                      onChange={(e) => setNewIndex({ ...newIndex, value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Acumulado (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newIndex.accumulated}
                      onChange={(e) => setNewIndex({ ...newIndex, accumulated: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowIndexDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddIndex}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
            <DialogTrigger asChild>
              <Button>
                <Calculator className="mr-2 h-4 w-4" />
                Aplicar Reajuste
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Aplicar Reajuste de Preços</DialogTitle>
                <DialogDescription>
                  Selecione o orçamento e configure o reajuste
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Orçamento</Label>
                  <Select
                    value={adjustmentForm.budgetId}
                    onValueChange={(value) => setAdjustmentForm({ ...adjustmentForm, budgetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um orçamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgets.map((budget) => (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name} - {formatCurrency(budget.totalValue)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Índice</Label>
                    <Select
                      value={adjustmentForm.indexType}
                      onValueChange={(value: any) => setAdjustmentForm({ ...adjustmentForm, indexType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INDEX_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {key} - {info.name.split(' - ')[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Cálculo</Label>
                    <Select
                      value={adjustmentForm.adjustmentType}
                      onValueChange={(value: any) => setAdjustmentForm({ ...adjustmentForm, adjustmentType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proportional">Proporcional (composto)</SelectItem>
                        <SelectItem value="accumulated">Acumulado</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Mês Base</Label>
                    <Select
                      value={adjustmentForm.baseMonth.toString()}
                      onValueChange={(value) => setAdjustmentForm({ ...adjustmentForm, baseMonth: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Base</Label>
                    <Input
                      type="number"
                      value={adjustmentForm.baseYear}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, baseYear: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mês Alvo</Label>
                    <Select
                      value={adjustmentForm.targetMonth.toString()}
                      onValueChange={(value) => setAdjustmentForm({ ...adjustmentForm, targetMonth: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Alvo</Label>
                    <Input
                      type="number"
                      value={adjustmentForm.targetYear}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, targetYear: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                {adjustmentForm.adjustmentType === 'custom' && (
                  <div className="space-y-2">
                    <Label>Fator Personalizado</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={adjustmentForm.customFactor}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, customFactor: parseFloat(e.target.value) || 0 })}
                      placeholder="Ex: 1.05 para 5% de aumento"
                    />
                  </div>
                )}

                <Button variant="outline" onClick={handlePreview}>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Preview
                </Button>

                {previewResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resultado do Reajuste</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor Original</p>
                          <p className="text-xl font-bold">{formatCurrency(previewResult.originalTotal)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fator de Reajuste</p>
                          <p className="text-xl font-bold text-green-600">{formatPercentage(previewResult.factor)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Valor Reajustado</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(previewResult.adjustedTotal)}</p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm">
                          <strong>Diferença:</strong> {formatCurrency(previewResult.difference)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {previewResult.items?.length || 0} itens serão reajustados
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowAdjustmentDialog(false)
                  setPreviewResult(null)
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleApplyAdjustment}
                  disabled={!previewResult}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aplicar Reajuste
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Index Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(INDEX_INFO).slice(0, 4).map(([key, info]) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{key}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getLatestAccumulated(key).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Acumulado 12 meses
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fonte: {info.source}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sobre os Índices</AlertTitle>
        <AlertDescription>
          Os índices oficiais (INCC, IGP-M, IPCA) são utilizados para reajustes contratuais na construção civil. 
          O INCC é específico para o setor e amplamente utilizado em contratos de obra. 
          Mantenha os índices atualizados para cálculos precisos.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <Tabs defaultValue="indices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="indices">Índices</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Reajustes</TabsTrigger>
          <TabsTrigger value="simular">Simulador</TabsTrigger>
        </TabsList>

        {/* Indices Tab */}
        <TabsContent value="indices">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Índices</CardTitle>
              <CardDescription>
                Valores mensais dos índices oficiais cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="INCC">
                <TabsList>
                  {Object.keys(INDEX_INFO).map((key) => (
                    <TabsTrigger key={key} value={key}>{key}</TabsTrigger>
                  ))}
                </TabsList>
                {Object.keys(INDEX_INFO).map((indexType) => (
                  <TabsContent key={indexType} value={indexType}>
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        {INDEX_INFO[indexType as keyof typeof INDEX_INFO].name} - 
                        Fonte: {INDEX_INFO[indexType as keyof typeof INDEX_INFO].source}
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-right">Variação Mensal</TableHead>
                            <TableHead className="text-right">Acumulado</TableHead>
                            <TableHead>Fonte</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getIndicesByType(indexType).map((index) => (
                            <TableRow key={index.id}>
                              <TableCell className="font-medium">
                                {MONTHS[index.month - 1]}/{index.year}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={index.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {index.value >= 0 ? '+' : ''}{index.value.toFixed(2)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {index.accumulated.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {index.source || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {getIndicesByType(indexType).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                Nenhum índice cadastrado para {indexType}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Reajustes Aplicados</CardTitle>
              <CardDescription>
                Todos os reajustes de orçamentos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orçamento</TableHead>
                    <TableHead>Índice</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Valor Original</TableHead>
                    <TableHead className="text-right">Fator</TableHead>
                    <TableHead className="text-right">Valor Reajustado</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow key={adj.id}>
                      <TableCell className="font-medium">{adj.budgetName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{adj.indexType}</Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(adj.baseDate)} - {formatDate(adj.targetDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(adj.originalValue)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatPercentage(adj.factor)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(adj.adjustedValue)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(adj.appliedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {adjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <History className="mx-auto h-8 w-8 mb-2" />
                        Nenhum reajuste aplicado ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simular">
          <Card>
            <CardHeader>
              <CardTitle>Simulador de Reajuste</CardTitle>
              <CardDescription>
                Calcule o reajuste sem aplicá-lo ao orçamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Atual</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1000000"
                    onChange={(e) => {
                      // Simulador simples
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Índice</Label>
                  <Select defaultValue="INCC">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(INDEX_INFO).map((key) => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Mês Inicial</Label>
                  <Select defaultValue="1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano Inicial</Label>
                  <Input type="number" defaultValue="2023" />
                </div>
                <div className="space-y-2">
                  <Label>Mês Final</Label>
                  <Select defaultValue={String(new Date().getMonth() + 1)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano Final</Label>
                  <Input type="number" defaultValue={String(new Date().getFullYear())} />
                </div>
              </div>
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertTitle>Simulação</AlertTitle>
                <AlertDescription>
                  Digite um valor e período para simular o reajuste baseado nos índices cadastrados.
                  O resultado é apenas uma estimativa.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
