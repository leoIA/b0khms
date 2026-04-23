// =============================================================================
// ConstrutorPro - AI Budget Assistant API
// POST /api/ia/orcamento
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { z } from 'zod';
import ZAI from 'z-ai-web-dev-sdk';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const aiBudgetRequestSchema = z.object({
  action: z.enum(['suggest_compositions', 'calculate_quantities', 'optimize_costs', 'analyze_budget']),
  projectId: z.string().optional(),
  budgetId: z.string().optional(),
  projectType: z.string().optional(),
  area: z.number().optional(),
  description: z.string().optional(),
  budget_items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
  })).optional(),
  constraints: z.object({
    maxBudget: z.number().optional(),
    priority: z.enum(['cost', 'quality', 'time']).optional(),
  }).optional(),
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

async function getProjectContext(projectId: string, companyId: string) {
  const project = await db.projects.findFirst({
    where: { id: projectId, companyId },
    include: {
      budgets: {
        include: {
          budget_items: {
            include: {
              compositions: true,
            },
          },
        },
      },
      schedules: {
        include: {
          schedule_tasks: true,
        },
      },
    },
  });

  return project;
}

async function getCompositionsContext(companyId: string) {
  const compositions = await db.compositions.findMany({
    where: { companyId, isActive: true },
    include: {
      composition_items: {
        orderBy: { order: 'asc' },
      },
    },
    take: 50,
  });

  return compositions.map((c) => ({
    code: c.code,
    name: c.name,
    unit: c.unit,
    totalCost: c.totalCost.toNumber(),
    totalPrice: c.totalPrice.toNumber(),
    composition_items: c.composition_items.map((i) => ({
      description: i.description,
      unit: i.unit,
      quantity: i.quantity.toNumber(),
      unitCost: i.unitCost.toNumber(),
      itemType: i.itemType,
    })),
  }));
}

// -----------------------------------------------------------------------------
// POST - AI Budget Assistant
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  const body = await request.json();
  const parseResult = aiBudgetRequestSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse('Dados inválidos', 400, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = parseResult.data;

  try {
    const zai = await ZAI.create();

    // Build context based on action
    let systemPrompt = `Você é um especialista em orçamentos de construção civil no Brasil, com conhecimento em SINAPI, composições de preços, e melhores práticas do setor.
Responda sempre em português brasileiro.
Forneça respostas estruturadas em formato JSON quando aplicável.
Use valores em Reais (R$).
Seja preciso e técnico, mas também didático.`;

    let userPrompt = '';
    let contextData: Record<string, unknown> = {};

    // Get company compositions for context
    const compositions = await getCompositionsContext(companyId);
    contextData.availableCompositions = compositions.slice(0, 20);

    switch (data.action) {
      case 'suggest_compositions':
        systemPrompt += `\n\nSua tarefa é sugerir composições de preços adequadas para um tipo de projeto.
Retorne um JSON com a estrutura:
{
  "suggestions": [
    {
      "compositionName": "nome",
      "compositionCode": "código SINAPI se aplicável",
      "unit": "unidade",
      "estimatedQuantity": número,
      "estimatedUnitPrice": número,
      "totalPrice": número,
      "justification": "explicação"
    }
  ],
  "totalEstimated": número,
  "notes": "observações gerais"
}`;
        
        if (data.projectId) {
          const project = await getProjectContext(data.projectId, companyId);
          if (project) {
            contextData.project = {
              name: project.name,
              description: project.description,
              estimatedValue: project.estimatedValue.toNumber(),
            };
          }
        }

        userPrompt = `Sugira composições de preços para um projeto de construção.
Tipo de projeto: ${data.projectType || 'Residencial'}
Área: ${data.area ? `${data.area} m²` : 'Não especificada'}
Descrição: ${data.description || 'Não especificada'}

Composições disponíveis na empresa: ${JSON.stringify(compositions.slice(0, 10), null, 2)}`;
        break;

      case 'calculate_quantities':
        systemPrompt += `\n\nSua tarefa é calcular quantidades de materiais e serviços baseado em área e tipo de obra.
Retorne um JSON com a estrutura:
{
  "calculations": [
    {
      "item": "nome do item",
      "formula": "fórmula usada",
      "quantity": número,
      "unit": "unidade",
      "coefficient": "coeficiente aplicado se houver"
    }
  ],
  "assumptions": ["lista de premissas"],
  "notes": "observações"
}`;

        userPrompt = `Calcule as quantidades necessárias para uma obra.
Tipo de projeto: ${data.projectType || 'Residencial'}
Área: ${data.area ? `${data.area} m²` : 'Não especificada'}
Descrição: ${data.description || 'Não especificada'}

Considere:
- Pisos, paredes, tetos
- Fundações
- Estrutura
- Instalações
- Acabamentos`;
        break;

      case 'optimize_costs':
        systemPrompt += `\n\nSua tarefa é analisar um orçamento e sugerir otimizações de custo.
Retorne um JSON com a estrutura:
{
  "optimizations": [
    {
      "item": "nome do item",
      "currentCost": número,
      "suggestedCost": número,
      "savings": número,
      "suggestion": "como reduzir"
    }
  ],
  "totalSavings": número,
  "savingsPercentage": número,
  "priorities": ["ordem de prioridade"],
  "risks": ["riscos das otimizações"]
}`;

        if (data.budget_items) {
          contextData.currentItems = data.budget_items;
        }

        userPrompt = `Analise e sugira otimizações para o seguinte orçamento:
${JSON.stringify(data.budget_items || [], null, 2)}

Restrições:
${data.constraints?.maxBudget ? `Orçamento máximo: ${formatCurrency(data.constraints.maxBudget)}` : 'Sem restrição de orçamento'}
Prioridade: ${data.constraints?.priority || 'equilibrado'}

Composições alternativas disponíveis: ${JSON.stringify(compositions.slice(0, 10), null, 2)}`;
        break;

      case 'analyze_budget':
        systemPrompt += `\n\nSua tarefa é analisar um orçamento e fornecer insights.
Retorne um JSON com a estrutura:
{
  "summary": {
    "totalItems": número,
    "totalValue": número,
    "averageItemPrice": número
  },
  "analysis": {
    "strengths": ["pontos fortes"],
    "weaknesses": ["pontos fracos"],
    "opportunities": ["oportunidades de melhoria"],
    "threats": ["riscos identificados"]
  },
  "benchmarkComparison": {
    "belowMarket": ["itens abaixo do mercado"],
    "aboveMarket": ["itens acima do mercado"],
    "inLine": ["itens na média do mercado"]
  },
  "recommendations": ["recomendações"]
}`;

        if (data.budgetId) {
          const project = await getProjectContext(data.projectId || '', companyId);
          if (project) {
            const budget = project.budgets.find((b) => b.id === data.budgetId);
            if (budget) {
              contextData.budget = {
                name: budget.name,
                totalValue: budget.totalValue.toNumber(),
                budget_items: budget.budget_items.map((i) => ({
                  description: i.description,
                  unit: i.unit,
                  quantity: i.quantity.toNumber(),
                  unitPrice: i.unitPrice.toNumber(),
                  totalPrice: i.totalPrice.toNumber(),
                })),
              };
            }
          }
        }

        userPrompt = `Analise o seguinte orçamento:
${JSON.stringify(data.budget_items || (contextData.budget as { items?: unknown[] })?.items || [], null, 2)}

Valor total: ${formatCurrency(
  data.budget_items?.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) ||
  (contextData.budget as { totalValue?: number })?.totalValue || 0
)}`;
        break;
    }

    // Add context data to prompt
    if (Object.keys(contextData).length > 0) {
      userPrompt += `\n\nDados de contexto:\n${JSON.stringify(contextData, null, 2)}`;
    }

    // Call AI
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Try to parse JSON from response
    let parsedResponse: Record<string, unknown>;
    try {
      // Extract JSON from response if it's wrapped in markdown code blocks
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                        aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      parsedResponse = { rawResponse: aiResponse };
    }

    return successResponse({
      action: data.action,
      result: parsedResponse,
      rawResponse: aiResponse,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    });
  } catch (error) {
    console.error('AI Budget Assistant error:', error);
    return errorResponse('Erro ao processar solicitação de IA.', 500);
  }
}
