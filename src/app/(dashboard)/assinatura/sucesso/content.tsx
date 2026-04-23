'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function PagamentoSucessoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/subscription/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, externalReference }),
        });

        if (response.ok) {
          const data = await response.json();
          setPlan(data.plan);
          toast({
            title: 'Pagamento confirmado!',
            description: 'Sua assinatura foi ativada com sucesso.',
          });
        }
      } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [paymentId, externalReference, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            {loading ? (
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            )}
          </div>
          <CardTitle className="text-2xl text-green-700 dark:text-green-400">
            {loading ? 'Processando...' : 'Pagamento Aprovado!'}
          </CardTitle>
          <CardDescription>
            {loading
              ? 'Aguarde enquanto confirmamos seu pagamento'
              : 'Sua assinatura foi ativada com sucesso'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {plan && (
            <p className="text-lg">
              Plano: <strong className="capitalize">{plan}</strong>
            </p>
          )}
          <p className="text-muted-foreground mt-2">
            Você agora tem acesso completo a todas as funcionalidades do seu plano.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={() => router.push('/dashboard')}
            className="bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            Ir para o Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
