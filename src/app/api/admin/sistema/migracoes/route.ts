import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * API para gerenciar migrações do banco de dados
 * Apenas para master_admin
 */

// Executar migrações
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    let result: { success: boolean; message: string; output?: string; error?: string };

    switch (action) {
      case 'migrate':
        // Executar prisma migrate deploy
        try {
          const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
            cwd: process.cwd(),
            timeout: 120000, // 2 minutos
          });
          result = {
            success: true,
            message: 'Migrações executadas com sucesso',
            output: stdout,
          };
          if (stderr) result.error = stderr;
        } catch (error: any) {
          result = {
            success: false,
            message: 'Erro ao executar migrações',
            error: error.message || String(error),
          };
        }
        break;

      case 'generate':
        // Executar prisma generate
        try {
          const { stdout, stderr } = await execAsync('npx prisma generate', {
            cwd: process.cwd(),
            timeout: 60000, // 1 minuto
          });
          result = {
            success: true,
            message: 'Cliente Prisma gerado com sucesso',
            output: stdout,
          };
          if (stderr) result.error = stderr;
        } catch (error: any) {
          result = {
            success: false,
            message: 'Erro ao gerar cliente Prisma',
            error: error.message || String(error),
          };
        }
        break;

      case 'seed':
        // Executar seed
        try {
          const { stdout, stderr } = await execAsync('npx prisma db seed', {
            cwd: process.cwd(),
            timeout: 180000, // 3 minutos
          });
          result = {
            success: true,
            message: 'Seed executado com sucesso',
            output: stdout,
          };
          if (stderr) result.error = stderr;
        } catch (error: any) {
          result = {
            success: false,
            message: 'Erro ao executar seed',
            error: error.message || String(error),
          };
        }
        break;

      case 'push':
        // Push schema para desenvolvimento
        try {
          const { stdout, stderr } = await execAsync('npx prisma db push', {
            cwd: process.cwd(),
            timeout: 120000,
          });
          result = {
            success: true,
            message: 'Schema sincronizado com sucesso',
            output: stdout,
          };
          if (stderr) result.error = stderr;
        } catch (error: any) {
          result = {
            success: false,
            message: 'Erro ao sincronizar schema',
            error: error.message || String(error),
          };
        }
        break;

      default:
        result = {
          success: false,
          message: 'Ação inválida. Use: migrate, generate, seed ou push',
        };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro na API de migrações:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Verificar status das migrações
export async function GET() {
  try {
    // Verificar se o Prisma está configurado
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const hasSchema = fs.existsSync(schemaPath);

    // Verificar migrations
    const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
    let migrations: string[] = [];
    if (fs.existsSync(migrationsPath)) {
      migrations = fs.readdirSync(migrationsPath).filter(f => {
        const fPath = path.join(migrationsPath, f);
        return fs.statSync(fPath).isDirectory();
      });
    }

    return NextResponse.json({
      hasSchema,
      migrationsCount: migrations.length,
      lastMigration: migrations.length > 0 ? migrations[migrations.length - 1] : null,
      commands: {
        migrate: 'npx prisma migrate deploy',
        generate: 'npx prisma generate',
        seed: 'npx prisma db seed',
        push: 'npx prisma db push',
        studio: 'npx prisma studio',
      },
    });
  } catch (error) {
    console.error('Erro ao verificar migrações:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao verificar migrações' },
      { status: 500 }
    );
  }
}
