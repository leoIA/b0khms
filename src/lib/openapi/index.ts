// =============================================================================
// ConstrutorPro - OpenAPI Configuration
// =============================================================================

import { openapiSchemas } from './schemas';
import { openapiPaths } from './paths';

// -----------------------------------------------------------------------------
// Common Parameters
// -----------------------------------------------------------------------------
export const openapiParameters = {
  PageParam: {
    name: 'page',
    in: 'query',
    description: 'Número da página para paginação',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  LimitParam: {
    name: 'limit',
    in: 'query',
    description: 'Quantidade de itens por página',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
  },
  SearchParam: {
    name: 'search',
    in: 'query',
    description: 'Termo de busca para filtrar resultados',
    schema: { type: 'string' },
  },
  SortByParam: {
    name: 'sortBy',
    in: 'query',
    description: 'Campo para ordenação',
    schema: { type: 'string', default: 'createdAt' },
  },
  SortOrderParam: {
    name: 'sortOrder',
    in: 'query',
    description: 'Direção da ordenação',
    schema: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc',
    },
  },
  IdParam: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'ID do recurso (UUID)',
    schema: { type: 'string', format: 'uuid' },
  },
};

// -----------------------------------------------------------------------------
// Security Schemes
// -----------------------------------------------------------------------------
export const openapiSecuritySchemes = {
  sessionAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'next-auth.session-token',
    description: 'Autenticação via sessão NextAuth.js',
  },
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Autenticação via token JWT',
  },
};

// -----------------------------------------------------------------------------
// OpenAPI Specification
// -----------------------------------------------------------------------------
export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'ConstrutorPro API',
    version: '1.0.0',
    description: `
# ConstrutorPro API

Plataforma premium de gestão de construção para o mercado brasileiro.

## Visão Geral

A API do ConstrutorPro permite gerenciar todos os aspectos de projetos de construção civil:

- **Projetos**: Gerenciamento completo de obras
- **Orçamentos**: Criação e controle de orçamentos
- **Clientes**: Cadastro e gestão de clientes
- **Fornecedores**: Cadastro e gestão de fornecedores
- **Materiais**: Controle de estoque e custos
- **Composições**: Composições de preços (SINAPI e customizadas)
- **Financeiro**: Contas a pagar e receber
- **Diário de Obra**: Registro diário de atividades
- **Cronogramas**: Planejamento físico-financeiro
- **IA**: Assistente inteligente para consultas

## Autenticação

A API utiliza autenticação via sessão (NextAuth.js) ou token JWT Bearer.

## Paginação

Todas as rotas de listagem suportam paginação através dos parâmetros:
- \`page\`: Número da página (padrão: 1)
- \`limit\`: Itens por página (padrão: 10, máx: 100)

## Códigos de Status

- \`200\`: Sucesso
- \`201\`: Criado com sucesso
- \`400\`: Erro de validação
- \`401\`: Não autenticado
- \`403\`: Sem permissão
- \`404\`: Não encontrado
- \`500\`: Erro interno do servidor
    `,
    contact: {
      name: 'ConstrutorPro Suporte',
      email: 'suporte@construtorpro.com.br',
      url: 'https://construtorpro.com.br',
    },
    license: {
      name: 'Proprietary',
      url: 'https://construtorpro.com.br/licenca',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Server',
    },
    {
      url: 'https://api.construtorpro.com.br/api',
      description: 'Production Server',
    },
  ],
  components: {
    schemas: openapiSchemas,
    parameters: openapiParameters,
    securitySchemes: openapiSecuritySchemes,
  },
  paths: openapiPaths,
  tags: [
    { name: 'System', description: 'Endpoints de sistema e monitoramento' },
    { name: 'Authentication', description: 'Autenticação e registro' },
    { name: 'Clients', description: 'Gestão de clientes' },
    { name: 'Projects', description: 'Gestão de projetos' },
    { name: 'Suppliers', description: 'Gestão de fornecedores' },
    { name: 'Budgets', description: 'Gestão de orçamentos' },
    { name: 'Materials', description: 'Gestão de materiais' },
    { name: 'Compositions', description: 'Composições de preços' },
    { name: 'Financial', description: 'Gestão financeira' },
    { name: 'Daily Logs', description: 'Diário de obra' },
    { name: 'Schedules', description: 'Cronogramas' },
    { name: 'Dashboard', description: 'Dashboard e estatísticas' },
    { name: 'SINAPI', description: 'Integração SINAPI' },
    { name: 'AI', description: 'Assistente de IA' },
  ],
};

// Export types
export type OpenAPISpec = typeof openapiSpec;
