// =============================================================================
// ConstrutorPro - Modelos de Propostas (Templates)
// =============================================================================

'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Copy,
  ArrowLeft,
  Save,
  Settings,
  Palette,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/api';

// Types
interface ProposalTemplate {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  defaultTerms: string | null;
  defaultPaymentTerms: string | null;
  defaultWarranty: string | null;
  defaultValidDays: number;
  includeCover: boolean;
  includeSummary: boolean;
  includeTimeline: boolean;
  includeTeam: boolean;
  includePortfolio: boolean;
  coverImage: string | null;
  customIntroduction: string | null;
  customStyles: string | null;
  sectionsConfig: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplatesResponse {
  data: ProposalTemplate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Fetch templates
async function fetchTemplates(params: { search?: string }): Promise<TemplatesResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);

  const response = await fetch(`/api/propostas/modelos?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Erro ao carregar modelos');
  return response.json();
}

// Create template
async function createTemplate(data: Partial<ProposalTemplate>): Promise<ProposalTemplate> {
  const response = await fetch('/api/propostas/modelos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar modelo');
  }
  return response.json().then(r => r.data);
}

// Update template
async function updateTemplate(id: string, data: Partial<ProposalTemplate>): Promise<ProposalTemplate> {
  const response = await fetch(`/api/propostas/modelos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar modelo');
  }
  return response.json().then(r => r.data);
}

// Delete template
async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/propostas/modelos/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao excluir modelo');
  }
}

// Empty template
function createEmptyTemplate(): Partial<ProposalTemplate> {
  return {
    name: '',
    code: '',
    description: '',
    category: '',
    defaultTerms: '',
    defaultPaymentTerms: '',
    defaultWarranty: '',
    defaultValidDays: 30,
    includeCover: true,
    includeSummary: true,
    includeTimeline: false,
    includeTeam: false,
    includePortfolio: false,
    customIntroduction: '',
    isActive: true,
    isDefault: false,
  };
}

// Template Form Dialog
function TemplateFormDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: {
  template?: ProposalTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ProposalTemplate>>(
    template || createEmptyTemplate()
  );

  const isEditing = !!template;

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateTemplate(template.id, formData);
      } else {
        await createTemplate(formData);
      }
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Editar Modelo' : 'Novo Modelo de Proposta'}
        </DialogTitle>
        <DialogDescription>
          Configure o modelo com as opções padrão para novas propostas
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Informações Básicas
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Proposta Residencial Padrão"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: RES-PADRAO"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category || ''}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residencial">Residencial</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="reforma">Reforma</SelectItem>
                  <SelectItem value="obra-nova">Obra Nova</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultValidDays">Validade Padrão (dias)</Label>
              <Input
                id="defaultValidDays"
                type="number"
                min="1"
                max="365"
                value={formData.defaultValidDays || 30}
                onChange={(e) => setFormData({ ...formData, defaultValidDays: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva quando usar este modelo..."
              rows={2}
            />
          </div>
        </div>

        <Separator />

        {/* Default Terms */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Termos Padrão
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultTerms">Termos e Condições Gerais</Label>
              <Textarea
                id="defaultTerms"
                value={formData.defaultTerms || ''}
                onChange={(e) => setFormData({ ...formData, defaultTerms: e.target.value })}
                placeholder="Termos e condições padrão..."
                rows={4}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultPaymentTerms">Condições de Pagamento</Label>
                <Textarea
                  id="defaultPaymentTerms"
                  value={formData.defaultPaymentTerms || ''}
                  onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                  placeholder="Ex: 50% na assinatura, 50% na entrega"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultWarranty">Garantia</Label>
                <Textarea
                  id="defaultWarranty"
                  value={formData.defaultWarranty || ''}
                  onChange={(e) => setFormData({ ...formData, defaultWarranty: e.target.value })}
                  placeholder="Ex: 5 anos para estrutura"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Presentation Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Opções de Apresentação
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeCover">Incluir Capa</Label>
              <Switch
                id="includeCover"
                checked={formData.includeCover ?? true}
                onCheckedChange={(v) => setFormData({ ...formData, includeCover: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeSummary">Incluir Resumo Executivo</Label>
              <Switch
                id="includeSummary"
                checked={formData.includeSummary ?? true}
                onCheckedChange={(v) => setFormData({ ...formData, includeSummary: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeTimeline">Incluir Cronograma</Label>
              <Switch
                id="includeTimeline"
                checked={formData.includeTimeline ?? false}
                onCheckedChange={(v) => setFormData({ ...formData, includeTimeline: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeTeam">Incluir Equipe</Label>
              <Switch
                id="includeTeam"
                checked={formData.includeTeam ?? false}
                onCheckedChange={(v) => setFormData({ ...formData, includeTeam: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includePortfolio">Incluir Portfólio</Label>
              <Switch
                id="includePortfolio"
                checked={formData.includePortfolio ?? false}
                onCheckedChange={(v) => setFormData({ ...formData, includePortfolio: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">Modelo Padrão</Label>
              <Switch
                id="isDefault"
                checked={formData.isDefault ?? false}
                onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customIntroduction">Introdução Personalizada</Label>
            <Textarea
              id="customIntroduction"
              value={formData.customIntroduction || ''}
              onChange={(e) => setFormData({ ...formData, customIntroduction: e.target.value })}
              placeholder="Texto de introdução que aparecerá no início das propostas..."
              rows={4}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function ModelosPropostasPage() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch templates
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['proposal-templates', search],
    queryFn: () => fetchTemplates({ search: search || undefined }),
    enabled: isAuthenticated,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
    },
  });

  const handleDelete = async (template: ProposalTemplate) => {
    if (!confirm(`Deseja excluir o modelo "${template.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(template.id);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (template: ProposalTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const templates = templatesData?.data ?? [];

  if (sessionLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/propostas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modelos de Propostas</h1>
            <p className="text-muted-foreground">
              Crie e gerencie modelos para agilizar a criação de propostas
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">
            Erro ao carregar modelos. Tente novamente.
          </CardContent>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum modelo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {search
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro modelo de proposta'}
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Modelo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Seções</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{template.name}</p>
                        {template.isDefault && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      {template.code && (
                        <p className="text-xs text-muted-foreground font-mono">{template.code}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.category ? (
                      <Badge variant="outline">{template.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{template.defaultValidDays} dias</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {template.includeCover && (
                        <Badge variant="secondary" className="text-xs">Capa</Badge>
                      )}
                      {template.includeSummary && (
                        <Badge variant="secondary" className="text-xs">Resumo</Badge>
                      )}
                      {template.includeTimeline && (
                        <Badge variant="secondary" className="text-xs">Cronograma</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.isActive ? (
                      <Badge className="bg-green-500 text-white">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(template.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(template)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Template Form Dialog */}
      <TemplateFormDialog
        template={editingTemplate}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        onSuccess={() => {}}
      />
    </div>
  );
}
