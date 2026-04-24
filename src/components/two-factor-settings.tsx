// =============================================================================
// ConstrutorPro - Two-Factor Authentication Settings Component
// Interface para configuração de autenticação de dois fatores (TOTP)
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Key,
  Copy,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: string | null;
}

interface SetupData {
  qrCode: string;
  secret: string;
  backupCodes: string[];
  verificationToken: string;
  message: string;
}

export function TwoFactorSettings() {
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);

  // Setup dialog
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Disable dialog
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // Backup codes dialog
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState('');

  // Carregar status do 2FA
  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const response = await fetch('/api/2fa');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Erro ao carregar status 2FA:', error);
    } finally {
      setLoading(false);
    }
  }

  // Iniciar setup do 2FA
  async function handleSetup() {
    setSetupLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSetupData(data);
        setSetupDialogOpen(true);
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao iniciar configuração do 2FA.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setSetupLoading(false);
    }
  }

  // Verificar e ativar 2FA
  async function handleVerifyAndEnable() {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Erro',
        description: 'Digite o código de 6 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setSetupLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          token: verificationCode,
          verificationToken: setupData?.verificationToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Sucesso',
          description: '2FA ativado com sucesso! Sua conta está mais segura.',
        });
        setSetupDialogOpen(false);
        setVerificationCode('');
        setSetupData(null);
        loadStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Código inválido.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao verificar código.',
        variant: 'destructive',
      });
    } finally {
      setSetupLoading(false);
    }
  }

  // Desativar 2FA
  async function handleDisable() {
    if (!disableCode || disableCode.length !== 6) {
      toast({
        title: 'Erro',
        description: 'Digite o código de 6 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setDisableLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable',
          token: disableCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Sucesso',
          description: '2FA desativado.',
        });
        setDisableDialogOpen(false);
        setDisableCode('');
        loadStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao desativar 2FA.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setDisableLoading(false);
    }
  }

  // Regenerar códigos de backup
  async function handleRegenerateBackup() {
    if (!regenerateCode || regenerateCode.length !== 6) {
      toast({
        title: 'Erro',
        description: 'Digite o código de 6 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setRegenerateLoading(true);
    try {
      const response = await fetch('/api/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate-backup',
          token: regenerateCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewBackupCodes(data.backupCodes);
        toast({
          title: 'Sucesso',
          description: 'Novos códigos de backup gerados.',
        });
        setRegenerateCode('');
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao gerar novos códigos.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setRegenerateLoading(false);
    }
  }

  // Copiar para clipboard
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado',
        description: 'Copiado para a área de transferência.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar.',
        variant: 'destructive',
      });
    }
  }

  // Download dos códigos de backup
  function downloadBackupCodes(codes: string[]) {
    const content = `ConstrutorPro - Códigos de Backup 2FA
Gerado em: ${new Date().toLocaleString('pt-BR')}
==========================================

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

==========================================
IMPORTANTE: Guarde estes códigos em local seguro.
Cada código pode ser usado apenas uma vez.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'construtorpro-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
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
            Autenticação de Dois Fatores (2FA)
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.enabled ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">2FA Ativado</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Ativo
                      </Badge>
                    </div>
                    {status.verifiedAt && (
                      <p className="text-sm text-muted-foreground">
                        Ativado em {new Date(status.verifiedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Conta Protegida</AlertTitle>
                <AlertDescription>
                  Sua conta está protegida com autenticação de dois fatores.
                  Sempre que fizer login, você precisará do código gerado pelo seu app autenticador.
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBackupDialogOpen(true)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Novos Códigos de Backup
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDisableDialogOpen(true)}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Desativar 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <ShieldOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <span className="font-medium">2FA Desativado</span>
                  <p className="text-sm text-muted-foreground">
                    Recomendamos ativar para maior segurança
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Recomendação de Segurança</AlertTitle>
                <AlertDescription>
                  Ative a autenticação de dois fatores para proteger sua conta contra acessos não autorizados.
                  Você precisará de um app autenticador como Google Authenticator ou Microsoft Authenticator.
                </AlertDescription>
              </Alert>

              <Button onClick={handleSetup} disabled={setupLoading}>
                {setupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Ativar 2FA
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Configurar Autenticação de Dois Fatores
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu app autenticador
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img src={setupData.qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              </div>

              {/* Chave manual */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Ou digite manualmente:
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1 font-mono text-sm bg-muted p-2 rounded break-all">
                    {showSecret ? setupData.secret : '••••••••••••••••'}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(setupData.secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Códigos de backup */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Códigos de Backup (guarde em local seguro)
                </Label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                  {setupData.backupCodes.map((code, i) => (
                    <div key={i} className="text-center">{code}</div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => downloadBackupCodes(setupData.backupCodes)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Códigos de Backup
                </Button>
              </div>

              {/* Verificação */}
              <div className="space-y-2">
                <Label htmlFor="verificationCode">
                  Digite o código de 6 dígitos do seu app autenticador:
                </Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleVerifyAndEnable} disabled={setupLoading}>
              {setupLoading ? (
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
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="h-5 w-5" />
              Desativar Autenticação de Dois Fatores
            </DialogTitle>
            <DialogDescription>
              Esta ação reduzirá a segurança da sua conta
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Ao desativar o 2FA, sua conta ficará menos segura. Recomendamos mantê-lo ativo.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="disableCode">
              Digite o código 2FA para confirmar:
            </Label>
            <Input
              id="disableCode"
              type="text"
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={disableLoading}
            >
              {disableLoading ? (
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
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Regenerar Códigos de Backup
            </DialogTitle>
            <DialogDescription>
              Os códigos anteriores serão invalidados
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes.length > 0 ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Novos Códigos Gerados</AlertTitle>
                <AlertDescription>
                  Guarde estes códigos em local seguro. Cada código pode ser usado apenas uma vez.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                {newBackupCodes.map((code, i) => (
                  <div key={i} className="text-center">{code}</div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => downloadBackupCodes(newBackupCodes)}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar Códigos de Backup
              </Button>

              <Button
                className="w-full"
                onClick={() => {
                  setBackupDialogOpen(false);
                  setNewBackupCodes([]);
                }}
              >
                Concluído
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="regenerateCode">
                  Digite o código 2FA para confirmar:
                </Label>
                <Input
                  id="regenerateCode"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  value={regenerateCode}
                  onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleRegenerateBackup}
                disabled={regenerateLoading}
              >
                {regenerateLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gerar Novos Códigos
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
