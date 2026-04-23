'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Database, Loader2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    databaseUrl: '',
    nextauthSecret: '',
    mercadopagoAccessToken: '',
    mercadopagoPublicKey: '',
  });

  const [status, setStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Verificar se já está configurado
  useEffect(() => {
    async function checkSetup() {
      try {
        const response = await fetch('/api/setup/status');
        const data = await response.json();
        
        if (data.configured) {
          setAlreadyConfigured(true);
          // Se já configurado, redirecionar para o site
          setTimeout(() => {
            router.push('/');
          }, 2000);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      } finally {
        setCheckingStatus(false);
      }
    }
    
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    // Validação básica
    if (!formData.databaseUrl) {
      setStatus({
        type: 'error',
        message: 'A URL do banco de dados é obrigatória',
      });
      setLoading(false);
      return;
    }

    // Validar formato da URL do banco
    const validDbPrefixes = ['postgresql://', 'postgres://', 'mysql://', 'sqlite:', 'file:'];
    const isValidDbUrl = validDbPrefixes.some(prefix => formData.databaseUrl.startsWith(prefix));
    
    if (!isValidDbUrl) {
      setStatus({
        type: 'error',
        message: 'URL do banco inválida. Deve começar com postgresql://, mysql:// ou sqlite:',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus({
          type: 'success',
          message: 'Configuração salva com sucesso! Iniciando o sistema...',
        });
        
        // Aguardar um momento e redirecionar
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Erro ao salvar configuração',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Erro de conexão. Verifique se o servidor está funcionando.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Tela de carregamento inicial
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando configurações...</p>
        </div>
      </div>
    );
  }

  // Se já configurado, mostrar mensagem
  if (alreadyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sistema Já Configurado</h2>
              <p className="text-gray-600">Redirecionando para o sistema...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Database className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ConstrutorPro</h1>
          </div>
          <p className="text-gray-600 text-lg">Configuração Inicial do Sistema</p>
        </div>

        {/* Card Principal */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Bem-vindo ao Setup</CardTitle>
            <CardDescription>
              Configure as variáveis de ambiente necessárias para o funcionamento do sistema.
              Esta configuração só será necessária uma vez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* DATABASE_URL - Obrigatório */}
              <div className="space-y-2">
                <Label htmlFor="databaseUrl" className="flex items-center gap-2">
                  URL do Banco de Dados *
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Obrigatório</span>
                </Label>
                <div className="relative">
                  <Input
                    id="databaseUrl"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="postgresql://usuario:senha@host:5432/banco"
                    value={formData.databaseUrl}
                    onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Exemplo PostgreSQL: postgresql://postgres:senha@localhost:5432/construtorpro
                </p>
              </div>

              {/* NEXTAUTH_SECRET */}
              <div className="space-y-2">
                <Label htmlFor="nextauthSecret" className="flex items-center gap-2">
                  Chave Secreta NextAuth
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Recomendado</span>
                </Label>
                <Input
                  id="nextauthSecret"
                  type="text"
                  placeholder="gerado-automaticamente-se-vazio"
                  value={formData.nextauthSecret}
                  onChange={(e) => setFormData({ ...formData, nextauthSecret: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Se não informado, será gerado automaticamente.
                </p>
              </div>

              {/* MercadoPago - Opcional */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-medium">Integração MercadoPago</span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Opcional</span>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mercadoPagoToken">Access Token</Label>
                    <Input
                      id="mercadoPagoToken"
                      type="text"
                      placeholder="TEST-xxxx-xxxx-xxxx"
                      value={formData.mercadopagoAccessToken}
                      onChange={(e) => setFormData({ ...formData, mercadopagoAccessToken: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mercadoPagoKey">Public Key</Label>
                    <Input
                      id="mercadoPagoKey"
                      type="text"
                      placeholder="TEST-xxxx-xxxx-xxxx"
                      value={formData.mercadopagoPublicKey}
                      onChange={(e) => setFormData({ ...formData, mercadopagoPublicKey: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Configure depois em Configurações se preferir.
                </p>
              </div>

              {/* Status Message */}
              {status.type !== 'idle' && (
                <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
                  {status.type === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertTitle>{status.type === 'error' ? 'Erro' : 'Sucesso'}</AlertTitle>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando Configuração...
                  </>
                ) : (
                  'Salvar e Iniciar Sistema'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Ajuda */}
        <Accordion type="single" collapsible className="mt-6">
          <AccordionItem value="help">
            <AccordionTrigger className="text-gray-600 hover:text-gray-900">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Precisa de ajuda?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900">PostgreSQL (Recomendado)</h4>
                  <p>URL: <code className="bg-gray-100 px-1 rounded">postgresql://usuario:senha@host:5432/nome_banco</code></p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">MySQL</h4>
                  <p>URL: <code className="bg-gray-100 px-1 rounded">mysql://usuario:senha@host:3306/nome_banco</code></p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">SQLite (Desenvolvimento)</h4>
                  <p>URL: <code className="bg-gray-100 px-1 rounded">file:./dev.db</code></p>
                </div>
                <div className="pt-2 border-t">
                  <h4 className="font-medium text-gray-900">Provedores de Banco Cloud Grátis</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Supabase</strong> - PostgreSQL gratuito (supabase.com)</li>
                    <li><strong>Neon</strong> - PostgreSQL serverless (neon.tech)</li>
                    <li><strong>Railway</strong> - PostgreSQL/MySQL (railway.app)</li>
                    <li><strong>PlanetScale</strong> - MySQL serverless (planetscale.com)</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>ConstrutorPro - Sistema de Gestão para Construtoras</p>
        </div>
      </div>
    </div>
  );
}
