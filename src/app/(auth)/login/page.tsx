// =============================================================================
// ConstrutorPro - Login Page
// =============================================================================

'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HardHat, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary animate-pulse" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(error ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validation
    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Login] Checking credentials with pre-login...');
      
      // First, check credentials and if 2FA is required
      const preLoginResponse = await fetch('/api/auth/pre-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          password 
        }),
      });

      const preLoginData = await preLoginResponse.json();

      if (!preLoginResponse.ok || !preLoginData.success) {
        console.log('[Login] Pre-login failed:', preLoginData.error);
        setErrorMessage(preLoginData.error || 'Email ou senha inválidos');
        return;
      }

      // Check if 2FA is required
      if (preLoginData.requires2FA) {
        console.log('[Login] 2FA required, redirecting to verification...');
        // Redirect to 2FA verification page
        const verifyUrl = `/verificar-2fa?email=${encodeURIComponent(email)}&tempToken=${preLoginData.tempToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
        router.push(verifyUrl);
        return;
      }

      // No 2FA required - proceed with normal login
      console.log('[Login] No 2FA, proceeding with signIn...');
      
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      console.log('[Login] Full result:', JSON.stringify(result, null, 2));

      // Check for explicit error
      if (result?.error) {
        console.log('[Login] Error detected:', result.error);
        
        if (result.error === 'CredentialsSignin') {
          setErrorMessage('Email ou senha inválidos. Verifique suas credenciais e tente novamente.');
        } else {
          setErrorMessage(`Erro de autenticação: ${result.error}`);
        }
        return;
      }
      
      // Check for success
      if (result?.ok === true) {
        console.log('[Login] Success! Redirecting to:', callbackUrl);
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push(callbackUrl);
        router.refresh();
        return;
      }
      
      // Handle edge case where result is undefined/null
      if (!result) {
        console.log('[Login] No result returned from signIn');
        setErrorMessage('Erro de conexão. Verifique sua rede e tente novamente.');
        return;
      }
      
      // Unknown state
      console.log('[Login] Unknown result state:', result);
      setErrorMessage('Erro desconhecido. Tente novamente.');
      
    } catch (err) {
      console.error('[Login] Exception:', err);
      setErrorMessage('Ocorreu um erro ao tentar fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <HardHat className="h-10 w-10" />
            <span className="text-2xl font-bold">ConstrutorPro</span>
          </Link>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Gestão completa para sua construtora
          </h1>
          <p className="text-lg opacity-90">
            Controle projetos, orçamentos, cronogramas, fornecedores e muito mais
            em uma única plataforma desenvolvida para o mercado brasileiro.
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                ✓
              </span>
              Gestão de projetos e cronogramas
            </li>
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                ✓
              </span>
              Orçamentos e composições de preços
            </li>
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                ✓
              </span>
              Diário de obra digital
            </li>
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                ✓
              </span>
              Controle financeiro integrado
            </li>
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                ✓
              </span>
              Assistente IA para engenheiros
            </li>
          </ul>
        </div>

        <div className="text-sm opacity-70">
          © 2024 ConstrutorPro. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <HardHat className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">ConstrutorPro</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Entrar</CardTitle>
              <CardDescription>
                Digite suas credenciais para acessar sua conta
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link
                      href="/recuperar-senha"
                      className="text-sm text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Lembrar de mim
                  </Label>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Link href="/registro" className="text-primary hover:underline">
                    Cadastre-se gratuitamente
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          {/* Demo credentials - only visible in development */}
          {String(process.env.NODE_ENV) === 'development' && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-center text-muted-foreground">
                  <strong>Credenciais de demonstração:</strong><br />
                  Email: admin@construtorpro.com<br />
                  Senha: admin123
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
