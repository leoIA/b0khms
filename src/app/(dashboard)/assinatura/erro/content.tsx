'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export function PagamentoErroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700 dark:text-red-400">
            Pagamento Recusado
          </CardTitle>
          <CardDescription>
            Não foi possível processar seu pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Ocorreu um erro ao processar seu pagamento. Isso pode acontecer por vários motivos:
          </p>
          <ul className="text-sm text-left text-muted-foreground space-y-1">
            <li>• Saldo insuficiente no cartão</li>
            <li>• Dados do cartão incorretos</li>
            <li>• Cartão bloqueado ou vencido</li>
            <li>• Limite de crédito excedido</li>
          </ul>
          {status && (
            <p className="text-xs text-muted-foreground">
              Status: {status}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={() => router.push('/assinatura')}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
          <Button
            variant="outline"
            asChild
            className="w-full"
          >
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
