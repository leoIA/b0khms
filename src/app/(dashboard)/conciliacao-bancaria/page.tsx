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
import { 
  Upload, Plus, RefreshCw, FileSpreadsheet, 
  Building2, TrendingUp, TrendingDown, 
  CheckCircle2, Clock, ArrowRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// =============================================================================
// Types
// =============================================================================

interface BankAccount {
  id: string
  bankName: string
  bankCode?: string
  agency?: string
  accountNumber: string
  accountType: 'checking' | 'savings'
  currentBalance: number
  status: string
}

interface BankTransaction {
  id: string
  date: Date
  amount: number
  type: 'credit' | 'debit'
  description: string
  status: 'pending' | 'matched' | 'reconciled'
  matchConfidence?: number
  matchedTransactionId?: string
}

interface SystemTransaction {
  id: string
  date: Date
  amount: number
  type: 'income' | 'expense'
  description: string
  reconciliationStatus: string
}

// =============================================================================
// Main Component
// =============================================================================

export default function ConciliacaoBancariaPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [systemTransactions, setSystemTransactions] = useState<SystemTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false)
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null)
  
  // New account form
  const [newAccount, setNewAccount] = useState({
    bankName: "",
    bankCode: "",
    agency: "",
    accountNumber: "",
    accountType: "checking" as 'checking' | 'savings',
    openingBalance: 0,
  })
  
  // Import config
  const [importConfig, setImportConfig] = useState({
    dateFormat: 'DD/MM/YYYY' as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD',
    delimiter: ';' as ',' | ';' | '\t',
    hasHeader: true,
  })

  // Load bank accounts
  const loadBankAccounts = useCallback(async () => {
    if (!session?.user?.companyId) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/conciliacao-bancaria/contas')
      if (response.ok) {
        const data = await response.json()
        setBankAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.companyId])

  // Load transactions for selected account
  const loadTransactions = useCallback(async (accountId: string) => {
    if (!accountId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/conciliacao-bancaria/transacoes?accountId=${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setSystemTransactions(data.systemTransactions || [])
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create new bank account
  const handleCreateAccount = async () => {
    if (!session?.user?.companyId) return
    
    try {
      const response = await fetch('/api/conciliacao-bancaria/contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          companyId: session.user.companyId,
        }),
      })
      
      if (response.ok) {
        toast({
          title: "Conta criada",
          description: "Conta bancária cadastrada com sucesso.",
        })
        setShowNewAccountDialog(false)
        setNewAccount({
          bankName: "",
          bankCode: "",
          agency: "",
          accountNumber: "",
          accountType: "checking",
          openingBalance: 0,
        })
        loadBankAccounts()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao criar conta.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar conta bancária.",
        variant: "destructive",
      })
    }
  }

  // Handle file import
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedAccount) return
    
    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('accountId', selectedAccount)
      formData.append('config', JSON.stringify(importConfig))
      
      const response = await fetch('/api/conciliacao-bancaria/importar', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Importação concluída",
          description: `${result.imported} transações importadas, ${result.matched} conciliadas automaticamente.`,
        })
        loadTransactions(selectedAccount)
      } else {
        const error = await response.json()
        toast({
          title: "Erro na importação",
          description: error.error || "Erro ao importar arquivo.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar arquivo.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  // Manual match
  const handleManualMatch = async (systemTransactionId: string) => {
    if (!selectedTransaction || !session?.user?.id) return
    
    try {
      const response = await fetch('/api/conciliacao-bancaria/conciliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankTransactionId: selectedTransaction.id,
          systemTransactionId,
        }),
      })
      
      if (response.ok) {
        toast({
          title: "Conciliação realizada",
          description: "Transação conciliada com sucesso.",
        })
        setShowMatchDialog(false)
        setSelectedTransaction(null)
        loadTransactions(selectedAccount)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao realizar conciliação.",
        variant: "destructive",
      })
    }
  }

  // Auto match
  const handleAutoMatch = async () => {
    if (!selectedAccount) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/conciliacao-bancaria/auto-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount }),
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Auto-conciliação",
          description: `${result.matched} transações conciliadas automaticamente.`,
        })
        loadTransactions(selectedAccount)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro na auto-conciliação.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
      case 'reconciled':
        return <Badge className="bg-green-500">Conciliado</Badge>
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate stats
  const stats = {
    totalCredits: transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0),
    totalDebits: transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0),
    matched: transactions.filter(t => t.status === 'matched' || t.status === 'reconciled').length,
    pending: transactions.filter(t => t.status === 'pending').length,
  }

  const selectedAccountData = bankAccounts.find(a => a.id === selectedAccount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conciliação Bancária</h1>
          <p className="text-muted-foreground">
            Importe extratos e concilie transações bancárias automaticamente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBankAccounts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
                <DialogDescription>
                  Cadastre uma conta bancária para iniciar a conciliação
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Nome do Banco</Label>
                    <Input
                      id="bankName"
                      value={newAccount.bankName}
                      onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })}
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankCode">Código do Banco</Label>
                    <Input
                      id="bankCode"
                      value={newAccount.bankCode}
                      onChange={(e) => setNewAccount({ ...newAccount, bankCode: e.target.value })}
                      placeholder="Ex: 001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agency">Agência</Label>
                    <Input
                      id="agency"
                      value={newAccount.agency}
                      onChange={(e) => setNewAccount({ ...newAccount, agency: e.target.value })}
                      placeholder="Ex: 1234-5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Número da Conta</Label>
                    <Input
                      id="accountNumber"
                      value={newAccount.accountNumber}
                      onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                      placeholder="Ex: 12345-6"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Tipo de Conta</Label>
                    <Select
                      value={newAccount.accountType}
                      onValueChange={(value: 'checking' | 'savings') => 
                        setNewAccount({ ...newAccount, accountType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openingBalance">Saldo Inicial</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      value={newAccount.openingBalance}
                      onChange={(e) => setNewAccount({ ...newAccount, openingBalance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewAccountDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAccount}>Criar Conta</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Conta Bancária</Label>
              <Select value={selectedAccount} onValueChange={(value) => {
                setSelectedAccount(value)
                loadTransactions(value)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {account.bankName} - {account.accountNumber}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAccountData && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(selectedAccountData.currentBalance)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {selectedAccount && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalCredits)}
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions.filter(t => t.type === 'credit').length} transações
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalDebits)}
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions.filter(t => t.type === 'debit').length} transações
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conciliadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.matched}</div>
              <p className="text-xs text-muted-foreground">
                {transactions.length > 0 
                  ? Math.round((stats.matched / transactions.length) * 100) 
                  : 0}% do total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando conciliação
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {selectedAccount && (
        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import">Importar</TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="matched">Conciliadas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle>Importar Extrato</CardTitle>
                <CardDescription>
                  Importe arquivos OFX ou CSV do seu banco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Formato de Data</Label>
                    <Select
                      value={importConfig.dateFormat}
                      onValueChange={(value: any) => 
                        setImportConfig({ ...importConfig, dateFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delimitador CSV</Label>
                    <Select
                      value={importConfig.delimiter}
                      onValueChange={(value: any) => 
                        setImportConfig({ ...importConfig, delimiter: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=";">Ponto e vírgula (;)</SelectItem>
                        <SelectItem value=",">Vírgula (,)</SelectItem>
                        <SelectItem value="&#9;">Tabulação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Primeira Linha</Label>
                    <Select
                      value={importConfig.hasHeader ? 'header' : 'data'}
                      onValueChange={(value) => 
                        setImportConfig({ ...importConfig, hasHeader: value === 'header' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Cabeçalho</SelectItem>
                        <SelectItem value="data">Dados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".ofx,.csv"
                    onChange={handleFileImport}
                    className="hidden"
                    id="file-upload"
                    disabled={isImporting}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {isImporting ? (
                      <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isImporting 
                        ? "Processando arquivo..." 
                        : "Arraste um arquivo ou clique para selecionar"
                      }
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Formatos aceitos: OFX, CSV
                    </p>
                  </label>
                </div>

                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={handleAutoMatch}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Auto-Conciliar
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    <FileSpreadsheet className="inline h-4 w-4 mr-1" />
                    Suportado: OFX 1.0/2.0, CSV com configuração customizada
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Transações Pendentes</CardTitle>
                <CardDescription>
                  Transações que precisam de conciliação manual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.status === 'pending')
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            {transaction.type === 'credit' ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                Entrada
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1">
                                <TrendingDown className="h-4 w-4" />
                                Saída
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'credit' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction)
                                setShowMatchDialog(true)
                              }}
                            >
                              <ArrowRight className="mr-1 h-4 w-4" />
                              Conciliar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {transactions.filter(t => t.status === 'pending').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="mx-auto h-8 w-8 mb-2 text-green-500" />
                          Todas as transações foram conciliadas!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matched Tab */}
          <TabsContent value="matched">
            <Card>
              <CardHeader>
                <CardTitle>Transações Conciliadas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.status === 'matched' || t.status === 'reconciled')
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'credit' ? 'Entrada' : 'Saída'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            {transaction.matchConfidence ? (
                              <Badge variant={
                                transaction.matchConfidence >= 90 ? 'default' :
                                transaction.matchConfidence >= 70 ? 'secondary' : 'outline'
                              }>
                                {transaction.matchConfidence}%
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Todas as Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'credit' ? 'Entrada' : 'Saída'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Manual Match Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Conciliar Transação</DialogTitle>
            <DialogDescription>
              Selecione uma transação do sistema para conciliar
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Transação Bancária</p>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="font-medium">{selectedTransaction.description}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className={`font-bold ${selectedTransaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemTransactions
                  .filter(t => t.reconciliationStatus === 'unreconciled')
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleManualMatch(transaction.id)}
                        >
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatchDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {!selectedAccount && bankAccounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma conta cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre uma conta bancária para iniciar a conciliação
            </p>
            <Button onClick={() => setShowNewAccountDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
