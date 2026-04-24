// =============================================================================
// ConstrutorPro - Funcionário Detail Page (RH)
// =============================================================================

'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit, User, Briefcase, Banknote, FileText, Phone, Mail, MapPin, Calendar, Clock, Plane, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  rg: string | null;
  birthDate: string | null;
  gender: string | null;
  maritalStatus: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  employeeNumber: string | null;
  admissionDate: string;
  terminationDate: string | null;
  status: string;
  employmentType: string;
  workRegime: string | null;
  weeklyHours: number;
  jobTitle: string | null;
  department: string | null;
  projectId: string | null;
  salary: number;
  salaryType: string;
  cnpjCei: string | null;
  cbo: string | null;
  union: string | null;
  unionDuesPercent: number | null;
  bankName: string | null;
  bankCode: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  bankAccountType: string | null;
  pixKey: string | null;
  notes: string | null;
  createdAt: string;
  employee_documents: any[];
  employee_vacations: any[];
  employee_leaves: any[];
  time_records: any[];
  payroll_items: any[];
}

async function fetchEmployee(id: string): Promise<{ success: boolean; data: Employee }> {
  const response = await fetch(`/api/rh/funcionarios/${id}`);
  if (!response.ok) throw new Error('Funcionário não encontrado');
  return response.json();
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  terminated: { label: 'Demitido', variant: 'destructive' },
  suspended: { label: 'Suspenso', variant: 'secondary' },
  vacation: { label: 'Férias', variant: 'outline' },
  leave: { label: 'Afastado', variant: 'secondary' },
};

const EMPLOYMENT_TYPE_CONFIG: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  seasonal: 'Sazonal',
  intern: 'Estagiário',
  apprentice: 'Aprendiz',
};

export default function FuncionarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data?.data) {
    notFound();
  }

  const employee = data.data;

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return '-';
    const labels: Record<string, string> = { masculine: 'Masculino', feminine: 'Feminino', other: 'Outro' };
    return labels[gender] || gender;
  };

  const getMaritalStatusLabel = (status: string | null) => {
    if (!status) return '-';
    const labels: Record<string, string> = {
      single: 'Solteiro(a)',
      married: 'Casado(a)',
      divorced: 'Divorciado(a)',
      widowed: 'Viúvo(a)',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rh/funcionarios">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
              {getStatusBadge(employee.status)}
            </div>
            <p className="text-muted-foreground">
              {employee.employeeNumber ? `#${employee.employeeNumber}` : ''} • {employee.jobTitle || 'Cargo não definido'}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/rh/funcionarios/${employee.id}?edit=true`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Departamento</span>
            </div>
            <p className="text-lg font-semibold mt-1">{employee.department || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Salário</span>
            </div>
            <p className="text-lg font-semibold mt-1">{formatCurrency(Number(employee.salary))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Admissão</span>
            </div>
            <p className="text-lg font-semibold mt-1">{formatDate(employee.admissionDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Carga Horária</span>
            </div>
            <p className="text-lg font-semibold mt-1">{employee.weeklyHours}h/semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="employment">Dados Trabalhistas</TabsTrigger>
          <TabsTrigger value="financial">Dados Financeiros</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">CPF:</span>
                  <span>{formatCPF(employee.cpf)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">RG:</span>
                  <span>{employee.rg || '-'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Data de Nascimento:</span>
                  <span>{formatDate(employee.birthDate)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Gênero:</span>
                  <span>{getGenderLabel(employee.gender)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Estado Civil:</span>
                  <span>{getMaritalStatusLabel(employee.maritalStatus)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employee.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.mobile}</span>
                  </div>
                )}
                {(employee.address || employee.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      {employee.address}
                      {employee.city && `, ${employee.city}`}
                      {employee.state && <> - {employee.state}</>}
                      {employee.zipCode && <> • CEP: {employee.zipCode}</>}
                    </span>
                  </div>
                )}
                {!employee.email && !employee.phone && !employee.mobile && !employee.address && (
                  <p className="text-muted-foreground">Nenhum contato cadastrado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Trabalhistas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-muted-foreground">Tipo de Contratação:</span>
                  <p className="font-medium">{EMPLOYMENT_TYPE_CONFIG[employee.employmentType] || employee.employmentType}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-muted-foreground">Regime de Trabalho:</span>
                  <p className="font-medium">{employee.workRegime || '-'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-muted-foreground">Cargo:</span>
                  <p className="font-medium">{employee.jobTitle || '-'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-muted-foreground">Departamento:</span>
                  <p className="font-medium">{employee.department || '-'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-muted-foreground">CBO:</span>
                  <p className="font-medium">{employee.cbo || '-'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-muted-foreground">Sindicato:</span>
                  <p className="font-medium">{employee.union || '-'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-muted-foreground">CEI da Obra:</span>
                  <p className="font-medium">{employee.cnpjCei || '-'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-muted-foreground">Data de Demissão:</span>
                  <p className="font-medium">{formatDate(employee.terminationDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Salário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <span className="text-muted-foreground">Valor:</span>
                  <p className="text-2xl font-bold">{formatCurrency(Number(employee.salary))}</p>
                </div>
                <div className="space-y-2 mt-4">
                  <span className="text-muted-foreground">Tipo:</span>
                  <p>{employee.salaryType === 'monthly' ? 'Mensal' : 'Por Hora'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados Bancários</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.bankName ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">Banco:</span>
                      <span>{employee.bankName} ({employee.bankCode})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">Agência:</span>
                      <span>{employee.bankAgency}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">Conta:</span>
                      <span>{employee.bankAccount}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{employee.bankAccountType === 'checking' ? 'Corrente' : 'Poupança'}</span>
                    </div>
                    {employee.pixKey && (
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">PIX:</span>
                        <span>{employee.pixKey}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Dados bancários não cadastrados</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>Documentos anexados do funcionário</CardDescription>
            </CardHeader>
            <CardContent>
              {employee.employee_documents && employee.employee_documents.length > 0 ? (
                <div className="space-y-2">
                  {employee.employee_documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.type}</p>
                      </div>
                      <Badge variant="outline">{doc.fileExt?.toUpperCase()}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhum documento anexado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Férias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employee.employee_vacations && employee.employee_vacations.length > 0 ? (
                  <div className="space-y-2">
                    {employee.employee_vacations.slice(0, 3).map((vacation: any) => (
                      <div key={vacation.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm">{vacation.days} dias</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(vacation.vacationStart)} - {formatDate(vacation.vacationEnd)}
                          </p>
                        </div>
                        <Badge variant={vacation.status === 'approved' ? 'default' : 'secondary'}>
                          {vacation.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum registro de férias</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Afastamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employee.employee_leaves && employee.employee_leaves.length > 0 ? (
                  <div className="space-y-2">
                    {employee.employee_leaves.slice(0, 3).map((leave: any) => (
                      <div key={leave.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm">{leave.reason}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(leave.startDate)}</p>
                        </div>
                        <Badge variant={leave.status === 'active' ? 'destructive' : 'secondary'}>
                          {leave.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum registro de afastamento</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
