'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function Verificar2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const email = searchParams.get('email') || '';
  const tempToken = searchParams.get('tempToken') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleTokenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (token.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, tempToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Autenticação realizada com sucesso!');
        
        // Complete login by signing in
        await signIn('credentials', {
          email,
          action: '2fa-complete',
          tempToken: data.sessionToken,
          redirect: false,
        });
        
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(data.error || 'Código inválido');
        setToken('');
      }
    } catch (err) {
      setError('Erro ao verificar código. Tente novamente.');
      setToken('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verificação em Dois Fatores</CardTitle>
        <CardDescription>
          Digite o código de 6 dígitos do seu aplicativo autenticador
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="token">Código de Verificação</Label>
            <Input
              id="token"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={token}
              onChange={handleTokenChange}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Digite o código exibido no seu aplicativo autenticador (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || token.length !== 6}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleBackToLogin}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Login
          </Button>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <KeyRound className="h-3 w-3" />
              Não tem acesso ao seu autenticador?{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  toast.info('Use um dos seus códigos de backup no lugar do código de 6 dígitos');
                }}
              >
                Use um código de backup
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
