// =============================================================================
// ConstrutorPro - Export Licitações API Route
// API para exportação de orçamentos para formatos de licitação
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exportOrcamento, type ExportConfig } from '@/lib/export-licitacoes-service'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Parse do corpo da requisição
    const body = await request.json()
    
    // Validar campos obrigatórios
    const { budgetId, format, includeBDI, includeEncargos, clienteInfo, obraInfo } = body

    if (!budgetId) {
      return NextResponse.json(
        { error: 'ID do orçamento é obrigatório' },
        { status: 400 }
      )
    }

    if (!format || !['xml-sinapi', 'excel-caixa', 'pdf-memoria'].includes(format)) {
      return NextResponse.json(
        { error: 'Formato de exportação inválido. Use: xml-sinapi, excel-caixa ou pdf-memoria' },
        { status: 400 }
      )
    }

    // Configurar exportação
    const config: ExportConfig = {
      budgetId,
      companyId: session.user.companyId || '',
      format,
      includeBDI: includeBDI ?? true,
      includeEncargos: includeEncargos ?? true,
      clienteInfo,
      obraInfo,
    }

    // Executar exportação
    const result = await exportOrcamento(config)

    if (!result.success) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: 400 }
      )
    }

    // Retornar arquivo
    if (!result.data) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    // Converter para ArrayBuffer se for Buffer
    let arrayBuffer: ArrayBuffer;
    if (Buffer.isBuffer(result.data)) {
      arrayBuffer = result.data.buffer.slice(
        result.data.byteOffset,
        result.data.byteOffset + result.data.byteLength
      ) as ArrayBuffer;
    } else if (typeof result.data === 'string') {
      arrayBuffer = new TextEncoder().encode(result.data).buffer as ArrayBuffer;
    } else {
      arrayBuffer = result.data as ArrayBuffer;
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(arrayBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('Erro na exportação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Retornar informações sobre formatos disponíveis
    return NextResponse.json({
      formats: [
        {
          id: 'xml-sinapi',
          name: 'XML SINAPI',
          description: 'Formato XML padrão SINAPI para licitações públicas',
          extension: '.xml',
          mimeType: 'application/xml',
        },
        {
          id: 'excel-caixa',
          name: 'Excel Caixa',
          description: 'Planilha Excel no padrão Caixa Econômica Federal',
          extension: '.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        {
          id: 'pdf-memoria',
          name: 'PDF Memória de Cálculo',
          description: 'Documento PDF com memória de cálculo detalhada',
          extension: '.pdf',
          mimeType: 'application/pdf',
        },
      ],
    })
  } catch (error) {
    console.error('Erro ao listar formatos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
