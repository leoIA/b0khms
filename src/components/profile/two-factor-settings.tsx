'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Download,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: string | null;
  hasBackupCodes: boolean;
}

interface TwoFactorSetup {
  qrCodeDataUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Setup dialog state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [setupToken, setSetupToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Disable dialog state
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  
  // Backup codes dialog state
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupToken, setBackupToken] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/2fa/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setSetupData(data.data);
        setShowSetupDialog(true);
      } else {
        toast.error(data.error || 'Erro ao configurar 2FA');
      }
    } catch (error) {
      toast.error('Erro ao configurar 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!setupToken || setupToken.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    
    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: setupToken }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Autenticação de dois fatores ativada!');
        setShowSetupDialog(false);
        setSetupToken('');
        setSetupData(null);
        fetchStatus();
      } else {
        toast.error(data.error || 'Código inválido');
      }
    } catch (error) {
      toast.error('Erro ao verificar código');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      toast.error('Digite sua senha');
      return;
    }
    
    setIsDisabling(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Autenticação de dois fatores desativada');
        setShowDisableDialog(false);
        setDisablePassword('');
        fetchStatus();
      } else {
        toast.error(data.error || 'Erro ao desativar 2FA');
      }
    } catch (error) {
      toast.error('Erro ao desativar 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!backupToken || backupToken.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: backupToken }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewBackupCodes(data.data.backupCodes);
        toast.success('Novos códigos de backup gerados!');
      } else {
        toast.error(data.error || 'Erro ao gerar códigos');
      }
    } catch (error) {
      toast.error('Erro ao gerar códigos');
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Copiado para a área de transferência');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes && !newBackupCodes.length) return;
    
    const codes = setupData?.backupCodes || newBackupCodes;
    const content = `ConstrutorPro - Códigos de Backup 2FA
=====================================

IMPORTANTE: Guarde estes códigos em local seguro.
Cada código pode ser usado apenas uma vez.

${codes.join('\n')}

Gerado em: ${new Date().toLocaleString('pt-BR')}
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'construtorpro-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação em Dois Fatores
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">2FA Ativo</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">
                      Ativado
                    </Badge>
                  </div>
                  {status.verifiedAt && (
                    <p className="text-sm text-muted-foreground">
                      Ativado em {new Date(status.verifiedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBackupDialog(true)}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Novos Códigos de Backup
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Desativar 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="font-medium">2FA Desativado</span>
                  <p className="text-sm text-muted-foreground">
                    Recomendamos ativar para maior segurança
                  </p>
                </div>
              </div>
              
              <Button onClick={handleSetup}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Ativar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Autenticação em Dois Fatores</DialogTitle>
            <DialogDescription>
              Escaneie o QR code com seu aplicativo autenticador
            </DialogDescription>
          </DialogHeader>
          
          {setupData && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border p-4 bg-white">
                  <Image
                    src={setupData.qrCodeDataUrl}
                    alt="QR Code para 2FA"
                    className="h-48 w-48"
                    width={192}
                    height={192}
                    unoptimized
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Escaneie com Google Authenticator, Authy ou similar
                </p>
              </div>
              
              {/* Manual Entry */}
              <div className="space-y-2">
                <Label>Ou digite manualmente:</Label>
                <div className="flex gap-2">
                  <Input
                    value={setupData.manualEntryKey}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(setupData.manualEntryKey.replace(/\s/g, ''))}
                  >
                    {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Verify Token */}
              <div className="space-y-2">
                <Label htmlFor="setupToken">Digite o código de verificação:</Label>
                <Input
                  id="setupToken"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
              
              {/* Backup Codes */}
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription>
                  <strong>Códigos de Backup:</strong> Guarde estes códigos em local seguro.
                  Eles podem ser usados se você perder acesso ao seu autenticador.
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                    >
                      <Copy className="mr-2 h-3 w-3" />
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadBackupCodes}
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Baixar
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="max-h-32 overflow-y-auto rounded border p-2 bg-muted">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {setupData.backupCodes.map((code, i) => (
                    <div key={i} className="text-center">{code}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleVerifySetup}
              disabled={setupToken.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ativar 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Desativar 2FA
            </DialogTitle>
            <DialogDescription>
              Isso removerá a autenticação em dois fatores da sua conta.
              Sua conta ficará menos segura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Recomendamos manter o 2FA ativado para proteger sua conta.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="disablePassword">Confirme sua senha:</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={!disablePassword || isDisabling}
            >
              {isDisabling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desativando...
                </>
              ) : (
                'Desativar 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Novos Códigos de Backup</DialogTitle>
            <DialogDescription>
              Digite o código do seu autenticador para gerar novos códigos de backup
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backupToken">Código de Verificação:</Label>
              <Input
                id="backupToken"
                value={backupToken}
                onChange={(e) => setBackupToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
            </div>
            
            {newBackupCodes.length > 0 && (
              <div className="space-y-2">
                <Label>Novos Códigos de Backup:</Label>
                <div className="max-h-32 overflow-y-auto rounded border p-2 bg-muted">
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    {newBackupCodes.map((code, i) => (
                      <div key={i} className="text-center">{code}</div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newBackupCodes.join('\n'))}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadBackupCodes}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Baixar
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBackupDialog(false);
              setBackupToken('');
              setNewBackupCodes([]);
            }}>
              Fechar
            </Button>
            {newBackupCodes.length === 0 && (
              <Button
                onClick={handleRegenerateBackupCodes}
                disabled={backupToken.length !== 6 || isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Códigos'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
