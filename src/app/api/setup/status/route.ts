import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API para verificar se o sistema já foi configurado
 * Verifica se existe arquivo de configuração salva
 */
export async function GET() {
  try {
    // Verificar se existe arquivo de configuração
    const configPath = path.join(process.cwd(), 'config.json');
    
    // Se o arquivo existe e tem conteúdo válido, está configurado
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // Verificar se tem DATABASE_URL configurada
      if (config.configured && config.databaseUrl) {
        return NextResponse.json({
          configured: true,
          message: 'Sistema já configurado',
        });
      }
    }
    
    // Verificar se DATABASE_URL já existe nas variáveis de ambiente
    // (caso já tenha sido configurada via painel de deploy)
    if (process.env.DATABASE_URL) {
      // Criar arquivo de configuração para marcar como configurado
      const config = {
        configured: true,
        databaseUrl: 'via-environment',
        configuredAt: new Date().toISOString(),
        viaEnv: true,
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      return NextResponse.json({
        configured: true,
        message: 'Configurado via variável de ambiente',
      });
    }
    
    return NextResponse.json({
      configured: false,
      message: 'Sistema precisa de configuração',
    });
  } catch (error) {
    console.error('Erro ao verificar configuração:', error);
    return NextResponse.json({
      configured: false,
      message: 'Erro ao verificar configuração',
    });
  }
}
