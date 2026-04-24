// =============================================================================
// ConstrutorPro - Two-Factor Authentication Component
// =============================================================================

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Smartphone,
  Key,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorStatus {
  enabled: boolean;
  activatedAt: string | null;
}

interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export function TwoFactorSection() {
  const { toast } = useToast();

  // States
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch 2FA status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/2fa?action=status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

  // Initialize
  useState(() => {
    fetchStatus();
  });

  // Start setup
  const handleSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });

      const data = await response.json();

      if (data.success) {
        setSetupData(data.data);
        setShowSetup(true);
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao configurar 2FA',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao configurar 2FA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Enable 2FA
  const handleEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Erro',
        description: 'Digite o código de 6 dígitos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enable',
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Autenticação de dois fatores ativada!',
        });
        setShowSetup(false);
        setSetupData(null);
        setVerificationCode('');
        fetchStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Código inválido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao ativar 2FA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Autenticação de dois fatores desativada',
        });
        setShowDisable(false);
        fetchStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao desativar 2FA',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao desativar 2FA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Regenerate backup codes
  const handleRegenerateCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-codes' }),
      });

      const data = await response.json();

      if (data.success) {
        setSetupData({
          secret: '',
          qrCodeUrl: '',
          backupCodes: data.data.backupCodes,
        });
        setShowSetup(true);
        toast({
          title: 'Sucesso',
          description: 'Novos códigos de backup gerados!',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao regenerar códigos',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao regenerar códigos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy backup codes
  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast({
        title: 'Copiado',
        description: 'Códigos de backup copiados para a área de transferência',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.enabled ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      2FA Ativado
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Sua conta está protegida
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Ativo
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCodes}
                  disabled={loading}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Novos Códigos de Backup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setShowDisable(true)}
                  disabled={loading}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Desativar 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted border">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">2FA Desativado</p>
                    <p className="text-sm text-muted-foreground">
                      Recomendamos ativar para maior segurança
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSetup} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                Ativar Autenticação de Dois Fatores
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Autenticação de Dois Fatores</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para ativar o 2FA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {setupData?.qrCodeUrl && (
              <div className="space-y-3">
                <Label>Passo 1: Escaneie o QR Code</Label>
                <p className="text-sm text-muted-foreground">
                  Use o Google Authenticator ou outro app autenticador para escanear o QR Code
                </p>
                <div className="p-4 bg-white rounded-lg border text-center">
                  <div className="inline-block p-2 bg-white rounded">
                    {/* QR Code placeholder - in production, render QR from qrCodeUrl */}
                    <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center mx-auto">
                      <div className="text-center">
                        <Smartphone className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          Escaneie com Google Authenticator
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Ou digite manualmente:
                  </p>
                  <code className="text-xs break-all">{setupData.secret}</code>
                </div>
              </div>
            )}

            {setupData?.backupCodes && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Códigos de Backup
                </Label>
                <p className="text-sm text-muted-foreground">
                  Guarde estes códigos em local seguro. Cada código pode ser usado uma única vez.
                </p>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {setupData.backupCodes.map((code, i) => (
                    <div key={i} className="text-center">
                      {code}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBackupCodes}
                  className="w-full"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copiar Códigos
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="verificationCode">Digite o código de verificação</Label>
              <Input
                id="verificationCode"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetup(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnable} disabled={loading || verificationCode.length !== 6}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Ativar 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Desativar 2FA
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar a autenticação de dois fatores?
              Sua conta ficará menos segura.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">
              Recomendamos manter o 2FA ativado para proteger sua conta contra acessos não autorizados.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisable(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisable} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldOff className="h-4 w-4 mr-2" />
              )}
              Desativar 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
