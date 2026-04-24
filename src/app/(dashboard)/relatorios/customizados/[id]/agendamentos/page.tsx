'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Pencil,
  Play,
  Pause,
  Mail,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
interface ReportSchedule {
  id: string
  name: string
  frequency: string
  scheduledTime: string
  timezone: string
  recipients: string[]
  format: string
  isActive: boolean
  nextRunAt: string | null
  lastRunAt: string | null
  createdAt: string
}

interface Report {
  id: string
  name: string
  type: string
}

// Labels
const frequencyLabels: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  custom: 'Personalizado',
}

const formatLabels: Record<string, string> = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  html: 'HTML',
}

const weekDays = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

// Fetch functions
async function fetchReport(id: string): Promise<Report> {
  const response = await fetch(`/api/relatorios/${id}`)
  if (!response.ok) throw new Error('Erro ao carregar relatório')
  return response.json()
}

async function fetchSchedules(reportId: string): Promise<{ data: ReportSchedule[] }> {
  const response = await fetch(`/api/relatorios/${reportId}/agendamentos`)
  if (!response.ok) throw new Error('Erro ao carregar agendamentos')
  return response.json()
}

async function createSchedule(reportId: string, data: Record<string, unknown>): Promise<ReportSchedule> {
  const response = await fetch(`/api/relatorios/${reportId}/agendamentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao criar agendamento')
  }
  return response.json()
}

async function updateSchedule(reportId: string, scheduleId: string, data: Record<string, unknown>): Promise<ReportSchedule> {
  const response = await fetch(`/api/relatorios/${reportId}/agendamentos/${scheduleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao atualizar agendamento')
  }
  return response.json()
}

async function deleteSchedule(reportId: string, scheduleId: string): Promise<void> {
  const response = await fetch(`/api/relatorios/${reportId}/agendamentos/${scheduleId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao excluir agendamento')
  }
}

export default function AgendamentosPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const reportId = params.id as string

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null)
  const [deletingSchedule, setDeletingSchedule] = useState<ReportSchedule | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [recipients, setRecipients] = useState('')
  const [format, setFormat] = useState('pdf')
  const [isActive, setIsActive] = useState(true)

  // Fetch report
  const { data: report, isLoading: isLoadingReport } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => fetchReport(reportId),
  })

  // Fetch schedules
  const { data: schedulesData, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['schedules', reportId],
    queryFn: () => fetchSchedules(reportId),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createSchedule(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', reportId] })
      toast({
        title: 'Agendamento criado',
        description: 'O agendamento foi criado com sucesso.',
      })
      setShowCreateDialog(false)
      resetForm()
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Record<string, unknown> }) =>
      updateSchedule(reportId, scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', reportId] })
      toast({
        title: 'Agendamento atualizado',
        description: 'As alterações foram salvas.',
      })
      setEditingSchedule(null)
      resetForm()
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (scheduleId: string) => deleteSchedule(reportId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', reportId] })
      toast({
        title: 'Agendamento excluído',
        description: 'O agendamento foi excluído.',
      })
      setDeletingSchedule(null)
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: ({ scheduleId, isActive }: { scheduleId: string; isActive: boolean }) =>
      updateSchedule(reportId, scheduleId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', reportId] })
    },
  })

  // Reset form
  const resetForm = () => {
    setName('')
    setFrequency('daily')
    setScheduledTime('09:00')
    setRecipients('')
    setFormat('pdf')
    setIsActive(true)
  }

  // Open edit dialog
  const openEditDialog = (schedule: ReportSchedule) => {
    setEditingSchedule(schedule)
    setName(schedule.name)
    setFrequency(schedule.frequency)
    setScheduledTime(schedule.scheduledTime)
    setRecipients(schedule.recipients.join(', '))
    setFormat(schedule.format)
    setIsActive(schedule.isActive)
  }

  // Handle save
  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para o agendamento.',
        variant: 'destructive',
      })
      return
    }
    if (!recipients.trim()) {
      toast({
        title: 'Destinatários obrigatórios',
        description: 'Informe ao menos um email.',
        variant: 'destructive',
      })
      return
    }

    const data = {
      name,
      frequency,
      scheduledTime,
      recipients: recipients.split(',').map(e => e.trim()).filter(Boolean),
      format,
      isActive,
      timezone: 'America/Sao_Paulo',
    }

    if (editingSchedule) {
      updateMutation.mutate({ scheduleId: editingSchedule.id, data })
    } else {
      createMutation.mutate({ reportId, ...data })
    }
  }

  const isLoading = isLoadingReport || isLoadingSchedules
  const schedules = schedulesData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/relatorios/customizados/${reportId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
            <p className="text-muted-foreground">
              {report?.name || 'Carregando...'}
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamentos Configurados
          </CardTitle>
          <CardDescription>
            Configure o envio automático do relatório por email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhum agendamento</h3>
              <p className="text-muted-foreground mb-4">
                Configure o envio automático deste relatório
              </p>
              <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Agendamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Próxima Execução</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {frequencyLabels[schedule.frequency] || schedule.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {schedule.scheduledTime}
                      </div>
                    </TableCell>
                    <TableCell>{formatLabels[schedule.format] || schedule.format}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {schedule.recipients.length} destinatário(s)
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.nextRunAt
                        ? formatDate(new Date(schedule.nextRunAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ scheduleId: schedule.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(schedule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeletingSchedule(schedule)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingSchedule} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingSchedule(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
            <DialogDescription>
              Configure o envio automático do relatório
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agendamento</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Envio Semanal para Gerentes"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Formato do Relatório</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destinatários (separados por vírgula)</Label>
              <Textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@exemplo.com, email2@exemplo.com"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Agendamento ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingSchedule(null)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingSchedule ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingSchedule} onOpenChange={(open) => {
        if (!open) setDeletingSchedule(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agendamento &quot;{deletingSchedule?.name}&quot;
              será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingSchedule && deleteMutation.mutate(deletingSchedule.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Textarea component
function Textarea({ 
  className, 
  ...props 
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
}
