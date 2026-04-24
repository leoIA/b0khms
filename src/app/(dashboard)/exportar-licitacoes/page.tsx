"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Download, FileSpreadsheet, FileText, FileCode, 
  Building2, MapPin, Calendar, RefreshCw, CheckCircle2,
  Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// =============================================================================
// Types
// =============================================================================

interface Budget {
  id: string
  name: string
  code?: string
  projectName: string
  totalValue: number
  status: string
  itemCount: number
}

interface ExportConfig {
  budgetId: string
  format: 'xml-sinapi' | 'excel-caixa' | 'pdf-memoria'
  includeBDI: boolean
  includeEncargos: boolean
  clienteInfo: {
    nome: string
    cnpj: string
    endereco: string
  }
  obraInfo: {
    endereco: string
    prazoExecucao: number
    dataInicio: string
  }
}

// =============================================================================
// Format Options
// =============================================================================

const FORMAT_OPTIONS = [
  {
    id: 'xml-sinapi',
    name: 'XML SINAPI',
    description: 'Formato padrão para sistemas de licitação (Caixa, BNDES)',
    icon: FileCode,
    extension: '.xml',
    mimeType: 'application/xml',
  },
  {
    id: 'excel-caixa',
    name: 'Excel Caixa',
    description: 'Planilha padrão para licitações da Caixa Econômica',
    icon: FileSpreadsheet,
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'pdf-memoria',
    name: 'PDF Memória de Cálculo',
    description: 'Documento com memorial descritivo e composição de custos',
    icon: FileText,
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
]

// =============================================================================
// Main Component
// =============================================================================

export default function ExportarLicitacoesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  
  // Export config
  const [config, setConfig] = useState<ExportConfig>({
    budgetId: "",
    format: "xml-sinapi",
    includeBDI: true,
    includeEncargos: true,
    clienteInfo: {
      nome: "",
      cnpj: "",
      endereco: "",
    },
    obraInfo: {
      endereco: "",
      prazoExecucao: 0,
      dataInicio: "",
    },
  })

  // Load budgets
  const loadBudgets = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/orcamentos?limit=100')
      if (response.ok) {
        const data = await response.json()
        setBudgets(data.budgets || data.data || [])
      }
    } catch (error) {
      console.error('Error loading budgets:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle export
  const handleExport = async () => {
    if (!config.budgetId) {
      toast({
        title: "Erro",
        description: "Selecione um orçamento para exportar.",
        variant: "destructive",
      })
      return
    }

    if (!session?.user?.companyId) {
      toast({
        title: "Erro",
        description: "Empresa não identificada.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    setExportSuccess(false)

    try {
      const response = await fetch('/api/exportar-licitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          companyId: session.user.companyId,
          obraInfo: {
            ...config.obraInfo,
            dataInicio: config.obraInfo.dataInicio ? new Date(config.obraInfo.dataInicio) : undefined,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          // Download file
          const downloadUrl = `/api/exportar-licitacoes/download?fileId=${result.fileId}`
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = result.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          setExportSuccess(true)
          toast({
            title: "Exportação concluída",
            description: `Arquivo ${result.filename} gerado com sucesso.`,
          })
        } else {
          toast({
            title: "Erro na exportação",
            description: result.error || "Erro ao gerar arquivo.",
            variant: "destructive",
          })
        }
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao exportar orçamento.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao exportar orçamento.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Format helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const selectedBudget = budgets.find(b => b.id === config.budgetId)
  const selectedFormat = FORMAT_OPTIONS.find(f => f.id === config.format)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exportar para Licitações</h1>
          <p className="text-muted-foreground">
            Gere arquivos nos formatos oficiais para licitações públicas
          </p>
        </div>
        <Button variant="outline" onClick={loadBudgets}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Formatos Disponíveis</AlertTitle>
        <AlertDescription>
          <strong>XML SINAPI:</strong> Padrão para sistemas de licitação (Caixa, BNDES, obras públicas).
          <br />
          <strong>Excel Caixa:</strong> Planilha modelo para licitações da Caixa Econômica Federal.
          <br />
          <strong>PDF Memória:</strong> Documento com memorial descritivo e composição de custos.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o Orçamento</Label>
                <Select
                  value={config.budgetId}
                  onValueChange={(value) => setConfig({ ...config, budgetId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um orçamento aprovado" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets
                      .filter(b => b.status === 'approved')
                      .map((budget) => (
                        <SelectItem key={budget.id} value={budget.id}>
                          <div className="flex items-center gap-2">
                            <span>{budget.name}</span>
                            <span className="text-muted-foreground">
                              - {formatCurrency(budget.totalValue)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBudget && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Código</p>
                      <p className="font-medium">{selectedBudget.code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Total</p>
                      <p className="font-medium">{formatCurrency(selectedBudget.totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Itens</p>
                      <p className="font-medium">{selectedBudget.itemCount || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formato de Exportação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {FORMAT_OPTIONS.map((format) => {
                  const Icon = format.icon
                  return (
                    <div
                      key={format.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        config.format === format.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setConfig({ ...config, format: format.id as any })}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          config.format === format.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{format.name}</p>
                            <Badge variant="outline">{format.extension}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{format.description}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          config.format === format.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {config.format === format.id && (
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Client and Work Info */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados do Contratante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome/Razão Social</Label>
                  <Input
                    value={config.clienteInfo.nome}
                    onChange={(e) => setConfig({
                      ...config,
                      clienteInfo: { ...config.clienteInfo, nome: e.target.value }
                    })}
                    placeholder="Nome do contratante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={config.clienteInfo.cnpj}
                    onChange={(e) => setConfig({
                      ...config,
                      clienteInfo: { ...config.clienteInfo, cnpj: e.target.value }
                    })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    value={config.clienteInfo.endereco}
                    onChange={(e) => setConfig({
                      ...config,
                      clienteInfo: { ...config.clienteInfo, endereco: e.target.value }
                    })}
                    placeholder="Endereço completo"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Dados da Obra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Endereço da Obra</Label>
                  <Textarea
                    value={config.obraInfo.endereco}
                    onChange={(e) => setConfig({
                      ...config,
                      obraInfo: { ...config.obraInfo, endereco: e.target.value }
                    })}
                    placeholder="Endereço completo da obra"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prazo (dias)</Label>
                    <Input
                      type="number"
                      value={config.obraInfo.prazoExecucao}
                      onChange={(e) => setConfig({
                        ...config,
                        obraInfo: { ...config.obraInfo, prazoExecucao: parseInt(e.target.value) || 0 }
                      })}
                      placeholder="360"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Início Prevista</Label>
                    <Input
                      type="date"
                      value={config.obraInfo.dataInicio}
                      onChange={(e) => setConfig({
                        ...config,
                        obraInfo: { ...config.obraInfo, dataInicio: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Opções de Exportação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeBDI"
                  checked={config.includeBDI}
                  onCheckedChange={(checked) => setConfig({ ...config, includeBDI: !!checked })}
                />
                <Label htmlFor="includeBDI" className="cursor-pointer">
                  Incluir BDI (Bonificação e Despesas Indiretas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeEncargos"
                  checked={config.includeEncargos}
                  onCheckedChange={(checked) => setConfig({ ...config, includeEncargos: !!checked })}
                />
                <Label htmlFor="includeEncargos" className="cursor-pointer">
                  Incluir Encargos Sociais na composição
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Orçamento</p>
                <p className="font-medium">{selectedBudget?.name || 'Não selecionado'}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Formato</p>
                <div className="flex items-center gap-2">
                  {selectedFormat && (
                    <>
                      <selectedFormat.icon className="h-4 w-4" />
                      <span className="font-medium">{selectedFormat.name}</span>
                    </>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold">
                  {selectedBudget ? formatCurrency(selectedBudget.totalValue) : '-'}
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleExport}
                disabled={!config.budgetId || isExporting}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar {selectedFormat?.extension || ''}
                  </>
                )}
              </Button>

              {exportSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-sm text-green-600 font-medium">
                    Exportação concluída!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Precisa de ajuda?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>XML SINAPI:</strong> Use para sistemas de licitação que exigem
                importação de arquivos no padrão SINAPI.
              </p>
              <p>
                <strong>Excel Caixa:</strong> Ideal para licitações da Caixa Econômica
                Federal e programas habitacionais.
              </p>
              <p>
                <strong>PDF Memória:</strong> Documento para análise técnica e
                memorial descritivo da obra.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
