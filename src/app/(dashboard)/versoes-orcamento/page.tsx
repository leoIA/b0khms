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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  GitBranch, Plus, History, RotateCcw, ArrowRight, 
  RefreshCw, Eye, Trash2, FileText, AlertTriangle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// =============================================================================
// Types
// =============================================================================

interface Budget {
  id: string
  name: string
  projectName: string
  totalValue: number
  status: string
  createdAt: Date
}

interface Version {
  id: string
  versionNumber: number
  name: string
  description?: string
  status: 'current' | 'superseded'
  totalValue: number
  changeReason?: string
  valueChange: number
  isLatest: boolean
  createdAt: Date
  createdBy: {
    id: string
    name: string
    email: string
  }
}

interface DiffResult {
  added: any[]
  removed: any[]
  modified: any[]
  totalValueChange: number
}

// =============================================================================
// Main Component
// =============================================================================

export default function VersoesOrcamentoPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<string>("")
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCompareDialog, setShowCompareDialog] = useState(false)
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  
  // New version form
  const [newVersion, setNewVersion] = useState({
    name: "",
    description: "",
    changeReason: "",
  })
  
  // Compare selection
  const [compareVersions, setCompareVersions] = useState({
    version1: "",
    version2: "",
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

  // Load versions
  const loadVersions = useCallback(async (budgetId: string) => {
    if (!budgetId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/versoes-orcamento?budgetId=${budgetId}`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
      }
    } catch (error) {
      console.error('Error loading versions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create new version
  const handleCreateVersion = async () => {
    if (!selectedBudget || !session?.user?.id) return
    
    try {
      const response = await fetch('/api/versoes-orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId: selectedBudget,
          name: newVersion.name,
          description: newVersion.description,
          changeReason: newVersion.changeReason,
        }),
      })
      
      if (response.ok) {
        toast({
          title: "Versão criada",
          description: "Nova versão do orçamento salva com sucesso.",
        })
        setShowCreateDialog(false)
        setNewVersion({ name: "", description: "", changeReason: "" })
        loadVersions(selectedBudget)
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao criar versão.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar versão.",
        variant: "destructive",
      })
    }
  }

  // Compare versions
  const handleCompare = async () => {
    if (!compareVersions.version1 || !compareVersions.version2) {
      toast({
        title: "Erro",
        description: "Selecione duas versões para comparar.",
        variant: "destructive",
      })
      return
    }
    
    try {
      const response = await fetch(
        `/api/versoes-orcamento/comparar?v1=${compareVersions.version1}&v2=${compareVersions.version2}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setDiffResult(data.diff)
        setShowCompareDialog(true)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao comparar versões.",
        variant: "destructive",
      })
    }
  }

  // Rollback
  const handleRollback = async () => {
    if (!selectedVersion || !session?.user?.id) return
    
    try {
      const response = await fetch('/api/versoes-orcamento/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: selectedVersion.id }),
      })
      
      if (response.ok) {
        toast({
          title: "Rollback realizado",
          description: "Orçamento restaurado para a versão selecionada.",
        })
        setShowRollbackDialog(false)
        setSelectedVersion(null)
        loadVersions(selectedBudget)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao realizar rollback.",
        variant: "destructive",
      })
    }
  }

  // Delete version
  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta versão?")) return
    
    try {
      const response = await fetch(`/api/versoes-orcamento/${versionId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast({
          title: "Versão excluída",
          description: "Versão removida com sucesso.",
        })
        loadVersions(selectedBudget)
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao excluir versão.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir versão.",
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatChange = (value: number) => {
    const formatted = formatCurrency(Math.abs(value))
    if (value > 0) return `+${formatted}`
    if (value < 0) return `-${formatted}`
    return formatted
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Versionamento de Orçamentos</h1>
          <p className="text-muted-foreground">
            Gerencie versões, compare alterações e restaure estados anteriores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            loadBudgets()
            if (selectedBudget) loadVersions(selectedBudget)
          }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button disabled={!selectedBudget}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Versão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Versão</DialogTitle>
                <DialogDescription>
                  Salve um snapshot do estado atual do orçamento
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Versão</Label>
                  <Input
                    value={newVersion.name}
                    onChange={(e) => setNewVersion({ ...newVersion, name: e.target.value })}
                    placeholder="Ex: Versão 1.0 - Proposta Inicial"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newVersion.description}
                    onChange={(e) => setNewVersion({ ...newVersion, description: e.target.value })}
                    placeholder="Descreva as principais alterações..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Motivo da Alteração</Label>
                  <Input
                    value={newVersion.changeReason}
                    onChange={(e) => setNewVersion({ ...newVersion, changeReason: e.target.value })}
                    placeholder="Ex: Ajuste de preços, adição de itens..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateVersion}>Criar Versão</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Orçamento</Label>
              <Select 
                value={selectedBudget} 
                onValueChange={(value) => {
                  setSelectedBudget(value)
                  loadVersions(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um orçamento" />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {budget.name} - {formatCurrency(budget.totalValue)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {versions.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Versões</p>
                  <p className="text-2xl font-bold">{versions.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Atual</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(versions[0]?.totalValue || 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compare Section */}
      {selectedBudget && versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparar Versões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Versão Anterior</Label>
                <Select
                  value={compareVersions.version1}
                  onValueChange={(value) => setCompareVersions({ ...compareVersions, version1: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.versionNumber} - {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground mb-3" />
              <div className="flex-1">
                <Label>Versão Atual</Label>
                <Select
                  value={compareVersions.version2}
                  onValueChange={(value) => setCompareVersions({ ...compareVersions, version2: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.versionNumber} - {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCompare}>Comparar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert */}
      {selectedBudget && (
        <Alert>
          <GitBranch className="h-4 w-4" />
          <AlertTitle>Versionamento Automático</AlertTitle>
          <AlertDescription>
            Cada versão salva um snapshot completo do orçamento. Você pode restaurar 
            qualquer versão anterior a qualquer momento. Um backup é criado automaticamente 
            antes de cada rollback.
          </AlertDescription>
        </Alert>
      )}

      {/* Versions Table */}
      {selectedBudget && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Versões</CardTitle>
            <CardDescription>
              Todas as versões salvas do orçamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <Badge variant={version.isLatest ? "default" : "outline"}>
                        v{version.versionNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{version.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(version.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {version.valueChange !== 0 && (
                        <span className={version.valueChange > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatChange(version.valueChange)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {version.isLatest ? (
                        <Badge className="bg-green-500">Atual</Badge>
                      ) : (
                        <Badge variant="secondary">Anterior</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {version.changeReason || '-'}
                    </TableCell>
                    <TableCell>{version.createdBy?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(version.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!version.isLatest && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Restaurar"
                              onClick={() => {
                                setSelectedVersion(version)
                                setShowRollbackDialog(true)
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Excluir"
                              onClick={() => handleDeleteVersion(version.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {versions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <History className="mx-auto h-8 w-8 mb-2" />
                      Nenhuma versão salva. Crie uma versão para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Comparação de Versões</DialogTitle>
            <DialogDescription>
              Diferenças entre as versões selecionadas
            </DialogDescription>
          </DialogHeader>
          
          {diffResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Itens Adicionados</p>
                    <p className="text-2xl font-bold text-green-600">
                      {diffResult.added.length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Itens Removidos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {diffResult.removed.length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Itens Modificados</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {diffResult.modified.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Variação Total</p>
                <p className={`text-3xl font-bold ${diffResult.totalValueChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatChange(diffResult.totalValueChange)}
                </p>
              </div>

              {diffResult.added.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Itens Adicionados</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diffResult.added.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {diffResult.removed.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Itens Removidos</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diffResult.removed.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="line-through text-muted-foreground">{item.description}</TableCell>
                          <TableCell className="text-muted-foreground">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {diffResult.modified.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-600 mb-2">Itens Modificados</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead>Anterior</TableHead>
                        <TableHead>Novo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diffResult.modified.flatMap((mod: any) => 
                        mod.changes.map((change: any, i: number) => (
                          <TableRow key={`${mod.item.id}-${i}`}>
                            <TableCell>{mod.item.description}</TableCell>
                            <TableCell className="capitalize">{change.field}</TableCell>
                            <TableCell className="text-red-600">
                              {change.field.includes('Price') || change.field.includes('totalValue')
                                ? formatCurrency(change.oldValue)
                                : String(change.oldValue)}
                            </TableCell>
                            <TableCell className="text-green-600">
                              {change.field.includes('Price') || change.field.includes('totalValue')
                                ? formatCurrency(change.newValue)
                                : String(change.newValue)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Versão</DialogTitle>
            <DialogDescription>
              Restaurar o orçamento para o estado desta versão
            </DialogDescription>
          </DialogHeader>
          
          {selectedVersion && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Esta ação irá substituir todos os itens atuais pelos itens da versão selecionada.
                  Um backup automático será criado antes do rollback.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">Versão a restaurar:</p>
                <p>v{selectedVersion.versionNumber} - {selectedVersion.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Valor: {formatCurrency(selectedVersion.totalValue)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRollbackDialog(false)
              setSelectedVersion(null)
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRollback}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {!selectedBudget && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <GitBranch className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Selecione um orçamento</h3>
            <p className="text-muted-foreground mb-4">
              Escolha um orçamento para visualizar e gerenciar suas versões
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
