'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, Copy, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export function PagamentoPendenteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const paymentId = searchParams.get('payment_id');

  const handleCopyId = () => {
    if (paymentId) {
      navigator.clipboard.writeText(paymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950 dark:to-amber-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl text-yellow-700 dark:text-yellow-400">
            Pagamento em Análise
          </CardTitle>
          <CardDescription>
            Seu pagamento está sendo processado
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            O pagamento foi iniciado e está aguardando confirmação. Isso geralmente
            acontece com pagamentos via PIX ou Boleto, que podem levar alguns minutos
            ou até 3 dias úteis para serem compensados.
          </p>
          <div className="bg-muted rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">O que fazer agora?</p>
            <ul className="text-left text-muted-foreground space-y-1">
              <li>• Aguarde a confirmação do pagamento</li>
              <li>• Você receberá um e-mail quando aprovado</li>
              <li>• Sua assinatura será ativada automaticamente</li>
            </ul>
          </div>
          {paymentId && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>ID do pagamento:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {paymentId.slice(0, 12)}...
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyId}
                className="h-6 w-6 p-0"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={() => router.push('/dashboard')}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Ir para o Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
