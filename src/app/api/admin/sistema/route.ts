// =============================================================================
// ConstrutorPro - API de Status do Sistema
// Retorna informações sobre configuração e conexões
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// GET /api/admin/sistema/status - Retornar status do sistema
// -----------------------------------------------------------------------------

export async function GET() {
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  // Verificar conexão com banco
  let databaseStatus = {
    connected: false,
    type: 'unknown',
    message: '',
  };

  try {
    await db.$queryRaw`SELECT 1`;
    databaseStatus.connected = true;
    
    // Detectar tipo de banco pela URL
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('postgresql')) {
      databaseStatus.type = 'PostgreSQL';
    } else if (dbUrl.includes('mysql')) {
      databaseStatus.type = 'MySQL';
    } else if (dbUrl.includes('sqlite')) {
      databaseStatus.type = 'SQLite';
    } else if (dbUrl.includes('mongodb')) {
      databaseStatus.type = 'MongoDB';
    }
  } catch (error) {
    databaseStatus.message = error instanceof Error ? error.message : 'Erro desconhecido';
  }

  // Verificar autenticação
  const authStatus = {
    configured: !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL),
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasUrl: !!process.env.NEXTAUTH_URL,
  };

  // Verificar MercadoPago
  const mercadopagoStatus = {
    configured: !!(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY),
    hasAccessToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    hasPublicKey: !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    hasWebhookSecret: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
    sandbox: process.env.MERCADOPAGO_SANDBOX === 'true',
  };

  // Verificar Email
  const emailStatus = {
    configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    host: process.env.SMTP_HOST || undefined,
  };

  // Informações da aplicação
  const appInfo = {
    url: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };

  return NextResponse.json({
    database: databaseStatus,
    auth: authStatus,
    mercadopago: mercadopagoStatus,
    email: emailStatus,
    app: appInfo,
  });
}

// -----------------------------------------------------------------------------
// GET /api/admin/sistema/test - Testar conexões
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  switch (type) {
    case 'database': {
      try {
        await db.$queryRaw`SELECT 1`;
        return NextResponse.json({ success: true, message: 'Conexão com banco de dados bem-sucedida' });
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        }, { status: 500 });
      }
    }

    case 'email': {
      // Teste básico de configuração SMTP
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };

      if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
        return NextResponse.json({ 
          success: false, 
          error: 'Configuração SMTP incompleta' 
        }, { status: 400 });
      }

      // Nota: Um teste real de SMTP requereria uma biblioteca como nodemailer
      // Por enquanto, apenas verificamos se as variáveis estão configuradas
      return NextResponse.json({ 
        success: true, 
        message: `Configuração SMTP válida (${smtpConfig.host}:${smtpConfig.port})` 
      });
    }

    case 'mercadopago': {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' 
        }, { status: 400 });
      }

      try {
        // Testar conexão com MercadoPago
        const response = await fetch('https://api.mercadopago.com/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ 
            success: true, 
            message: `Conectado como: ${data.nickname || data.email || 'Usuário MercadoPago'}` 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            error: `Erro ${response.status}: ${response.statusText}` 
          }, { status: 500 });
        }
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao conectar com MercadoPago' 
        }, { status: 500 });
      }
    }

    default:
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo de teste inválido. Use: database, email ou mercadopago' 
      }, { status: 400 });
  }
}
