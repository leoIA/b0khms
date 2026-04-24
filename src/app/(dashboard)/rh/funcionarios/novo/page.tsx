// =============================================================================
// ConstrutorPro - Novo Funcionário Page (RH)
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, User, Briefcase, Banknote, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface EmployeeFormData {
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  employeeNumber: string;
  admissionDate: string;
  employmentType: string;
  workRegime: string;
  weeklyHours: number;
  jobTitle: string;
  department: string;
  salary: number;
  salaryType: string;
  cbo: string;
  union: string;
  bankName: string;
  bankCode: string;
  bankAgency: string;
  bankAccount: string;
  bankAccountType: string;
  pixKey: string;
  notes: string;
}

const initialFormData: EmployeeFormData = {
  name: '',
  cpf: '',
  rg: '',
  birthDate: '',
  gender: '',
  maritalStatus: '',
  email: '',
  phone: '',
  mobile: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  employeeNumber: '',
  admissionDate: new Date().toISOString().split('T')[0],
  employmentType: 'clt',
  workRegime: '',
  weeklyHours: 44,
  jobTitle: '',
  department: '',
  salary: 0,
  salaryType: 'monthly',
  cbo: '',
  union: '',
  bankName: '',
  bankCode: '',
  bankAgency: '',
  bankAccount: '',
  bankAccountType: '',
  pixKey: '',
  notes: '',
};

async function createEmployee(data: EmployeeFormData): Promise<any> {
  const response = await fetch('/api/rh/funcionarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao cadastrar funcionário');
  }
  
  return response.json();
}

export default function NovoFuncionarioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Funcionário cadastrado com sucesso.',
      });
      router.push('/rh/funcionarios');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const updateField = (field: keyof EmployeeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rh/funcionarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Funcionário</h1>
          <p className="text-muted-foreground">
            Cadastre um novo funcionário na empresa
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="employment" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Dados Trabalhistas
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Dados Financeiros
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Banco
            </TabsTrigger>
          </TabsList>

          {/* Dados Pessoais */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Dados básicos do funcionário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => updateField('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => updateField('rg', e.target.value)}
                      placeholder="RG"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => updateField('birthDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero</Label>
                    <Select value={formData.gender} onValueChange={(v) => updateField('gender', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculine">Masculino</SelectItem>
                        <SelectItem value="feminine">Feminino</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Estado Civil</Label>
                    <Select value={formData.maritalStatus} onValueChange={(v) => updateField('maritalStatus', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Solteiro(a)</SelectItem>
                        <SelectItem value="married">Casado(a)</SelectItem>
                        <SelectItem value="divorced">Divorciado(a)</SelectItem>
                        <SelectItem value="widowed">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Contato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Celular</Label>
                      <Input
                        id="mobile"
                        value={formData.mobile}
                        onChange={(e) => updateField('mobile', e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder="Rua, número, bairro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => updateField('zipCode', e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dados Trabalhistas */}
          <TabsContent value="employment">
            <Card>
              <CardHeader>
                <CardTitle>Informações Trabalhistas</CardTitle>
                <CardDescription>Dados do contrato de trabalho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeNumber">Número de Registro</Label>
                    <Input
                      id="employeeNumber"
                      value={formData.employeeNumber}
                      onChange={(e) => updateField('employeeNumber', e.target.value)}
                      placeholder="Ex: 0001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissionDate">Data de Admissão *</Label>
                    <Input
                      id="admissionDate"
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => updateField('admissionDate', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Tipo de Contratação *</Label>
                    <Select value={formData.employmentType} onValueChange={(v) => updateField('employmentType', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clt">CLT</SelectItem>
                        <SelectItem value="pj">PJ</SelectItem>
                        <SelectItem value="seasonal">Sazonal</SelectItem>
                        <SelectItem value="intern">Estagiário</SelectItem>
                        <SelectItem value="apprentice">Aprendiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workRegime">Regime de Trabalho</Label>
                    <Select value={formData.workRegime} onValueChange={(v) => updateField('workRegime', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Tempo Integral</SelectItem>
                        <SelectItem value="partial">Tempo Parcial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weeklyHours">Carga Horária Semanal</Label>
                    <Input
                      id="weeklyHours"
                      type="number"
                      value={formData.weeklyHours}
                      onChange={(e) => updateField('weeklyHours', parseInt(e.target.value) || 44)}
                      min={1}
                      max={44}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Cargo</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => updateField('jobTitle', e.target.value)}
                      placeholder="Ex: Engenheiro Civil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select value={formData.department} onValueChange={(v) => updateField('department', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Engenharia">Engenharia</SelectItem>
                        <SelectItem value="Obras">Obras</SelectItem>
                        <SelectItem value="Administrativo">Administrativo</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                        <SelectItem value="Comercial">Comercial</SelectItem>
                        <SelectItem value="RH">Recursos Humanos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cbo">Código CBO</Label>
                    <Input
                      id="cbo"
                      value={formData.cbo}
                      onChange={(e) => updateField('cbo', e.target.value)}
                      placeholder="Ex: 2142-05"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="union">Sindicato</Label>
                    <Input
                      id="union"
                      value={formData.union}
                      onChange={(e) => updateField('union', e.target.value)}
                      placeholder="Nome do sindicato"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dados Financeiros */}
          <TabsContent value="financial">
            <Card>
              <CardHeader>
                <CardTitle>Informações Financeiras</CardTitle>
                <CardDescription>Salário e benefícios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salário *</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => updateField('salary', parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      min={0}
                      step={0.01}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryType">Tipo de Salário</Label>
                    <Select value={formData.salaryType} onValueChange={(v) => updateField('salaryType', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="hourly">Por Hora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Observações</h4>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações Gerais</Label>
                    <textarea
                      id="notes"
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder="Observações sobre o funcionário..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dados Bancários */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Dados Bancários</CardTitle>
                <CardDescription>Informações para depósito de salário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Banco</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => updateField('bankName', e.target.value)}
                      placeholder="Nome do banco"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankCode">Código do Banco</Label>
                    <Input
                      id="bankCode"
                      value={formData.bankCode}
                      onChange={(e) => updateField('bankCode', e.target.value)}
                      placeholder="Ex: 001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAgency">Agência</Label>
                    <Input
                      id="bankAgency"
                      value={formData.bankAgency}
                      onChange={(e) => updateField('bankAgency', e.target.value)}
                      placeholder="0000-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Conta</Label>
                    <Input
                      id="bankAccount"
                      value={formData.bankAccount}
                      onChange={(e) => updateField('bankAccount', e.target.value)}
                      placeholder="00000-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountType">Tipo de Conta</Label>
                    <Select value={formData.bankAccountType} onValueChange={(v) => updateField('bankAccountType', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixKey">Chave PIX</Label>
                    <Input
                      id="pixKey"
                      value={formData.pixKey}
                      onChange={(e) => updateField('pixKey', e.target.value)}
                      placeholder="CPF, email, telefone ou chave aleatória"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/rh/funcionarios">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? 'Salvando...' : 'Salvar Funcionário'}
          </Button>
        </div>
      </form>
    </div>
  );
}
