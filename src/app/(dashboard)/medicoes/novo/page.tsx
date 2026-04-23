// =============================================================================
// ConstrutorPro - Nova Medição Page
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  Search,
  Calculator,
  FileText,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Form schema
const medicaoItemSchema = z.object({
  composicaoId: z.string().min(1, 'Composição é obrigatória'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  quantidadeAnt: z.number().min(0),
  valorUnitario: z.number().min(0, 'Valor unitário deve ser maior ou igual a zero'),
  observacao: z.string().optional(),
});

const medicaoFormSchema = z.object({
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  dataInicio: z.string().min(1, 'Data início é obrigatória'),
  dataFim: z.string().min(1, 'Data fim é obrigatória'),
  observacoes: z.string().optional(),
  itens: z.array(medicaoItemSchema).min(1, 'Pelo menos um item é obrigatório'),
});

type MedicaoFormValues = z.infer<typeof medicaoFormSchema>;

interface Project {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface Composition {
  id: string;
  code: string;
  name: string;
  unit: string;
  totalCost: number;
  totalPrice: number;
  description: string | null;
}

export default function NovaMedicaoPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [compositionSearch, setCompositionSearch] = useState('');
  const [compositionPopoverOpen, setCompositionPopoverOpen] = useState(false);

  const form = useForm<MedicaoFormValues>({
    resolver: zodResolver(medicaoFormSchema),
    defaultValues: {
      projectId: '',
      dataInicio: '',
      dataFim: '',
      observacoes: '',
      itens: [],
    },
  });

  const itens = form.watch('itens');

  // Fetch projects and compositions
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [projectsRes, compositionsRes] = await Promise.all([
        fetch('/api/projetos?limit=100&status=active'),
        fetch('/api/composicoes?limit=200&isActive=true'),
      ]);

      const projectsData = await projectsRes.json();
      const compositionsData = await compositionsRes.json();

      if (projectsData.data) {
        setProjects(projectsData.data);
      }
      if (compositionsData.data) {
        setCompositions(compositionsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const filteredCompositions = compositions.filter((comp) =>
    comp.name.toLowerCase().includes(compositionSearch.toLowerCase()) ||
    comp.code.toLowerCase().includes(compositionSearch.toLowerCase())
  );

  const addItem = (composition: Composition) => {
    const currentItens = form.getValues('itens');
    form.setValue('itens', [
      ...currentItens,
      {
        composicaoId: composition.id,
        descricao: composition.name,
        unidade: composition.unit,
        quantidade: 1,
        quantidadeAnt: 0,
        valorUnitario: composition.totalPrice,
        observacao: '',
      },
    ]);
    setCompositionPopoverOpen(false);
    setCompositionSearch('');
  };

  const removeItem = (index: number) => {
    const currentItens = form.getValues('itens');
    form.setValue('itens', currentItens.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const currentItens = form.getValues('itens');
    const updatedItens = [...currentItens];
    updatedItens[index] = { ...updatedItens[index], [field]: value };
    form.setValue('itens', updatedItens);
  };

  const calculateTotal = () => {
    return itens.reduce((total, item) => total + (item.quantidade * item.valorUnitario), 0);
  };

  const onSubmit = async (data: MedicaoFormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/medicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Medição criada com sucesso.',
        });
        router.push('/medicoes');
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Não foi possível criar a medição.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar medição.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loadingData) {
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/medicoes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Medição</h1>
          <p className="text-muted-foreground">
            Registre uma nova medição de obra
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o projeto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                              {project.code && ` (${project.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dataInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Início *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataFim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Fim *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações gerais sobre a medição..."
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Itens</span>
                  <span className="font-medium">{itens.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Itens da Medição</CardTitle>
                    <CardDescription>
                      Adicione composições e quantidades executadas
                    </CardDescription>
                  </div>
                  <Popover open={compositionPopoverOpen} onOpenChange={setCompositionPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="end">
                      <Command>
                        <CommandInput
                          placeholder="Buscar composição..."
                          value={compositionSearch}
                          onValueChange={setCompositionSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhuma composição encontrada.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {filteredCompositions.map((composition) => (
                              <CommandItem
                                key={composition.id}
                                value={composition.id}
                                onSelect={() => addItem(composition)}
                              >
                                <div className="flex flex-col w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs">
                                      {composition.code}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {composition.unit}
                                    </span>
                                  </div>
                                  <span className="font-medium">
                                    {composition.name}
                                  </span>
                                  <span className="text-xs text-green-600">
                                    {formatCurrency(composition.totalPrice)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {itens.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      Nenhum item adicionado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Clique em "Adicionar Item" para começar
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">Descrição</TableHead>
                          <TableHead className="w-[10%]">Un.</TableHead>
                          <TableHead className="w-[15%] text-right">Qtd.</TableHead>
                          <TableHead className="w-[15%] text-right">Vl. Unit.</TableHead>
                          <TableHead className="w-[15%] text-right">Vl. Total</TableHead>
                          <TableHead className="w-[5%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                value={item.descricao}
                                onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                                className="border-0 p-0 h-auto focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.unidade}
                                onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                                className="border-0 p-0 h-auto focus-visible:ring-0 w-16"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantidade}
                                onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                                className="border-0 p-0 h-auto text-right focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.valorUnitario}
                                onChange={(e) => updateItem(index, 'valorUnitario', parseFloat(e.target.value) || 0)}
                                className="border-0 p-0 h-auto text-right focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.quantidade * item.valorUnitario)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {form.formState.errors.itens && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.itens.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/medicoes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading || itens.length === 0}>
            {loading ? 'Salvando...' : 'Salvar Medição'}
          </Button>
        </div>
      </form>
    </div>
  );
}
