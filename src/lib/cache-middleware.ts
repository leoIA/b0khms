/**
 * Middleware de Cache para API Routes
 * 
 * Implementa cache automático de respostas HTTP com:
 * - Headers de cache-control
 * - ETags para validação
 * - Invalidação automática por método
 * - Bypass para usuários autenticados
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager, CACHE_TTL, CACHE_KEYS } from './redis-cache';

// Configuração de cache por rota
interface CacheConfig {
  ttl: number;
  methods: string[];
  private: boolean; // Se true, não cachear para usuários autenticados
  varyBy?: string[]; // Headers para variar o cache
  bypassHeaders?: string[]; // Headers que bypassam o cache
}

// Configuração padrão de cache por tipo de endpoint
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Dashboards - cache curto
  '/api/dashboard': { ttl: CACHE_TTL.SHORT, methods: ['GET'], private: false },
  '/api/dashboard/stats': { ttl: CACHE_TTL.SHORT, methods: ['GET'], private: false },
  
  // Projetos - cache médio
  '/api/projetos': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  '/api/projetos/[id]': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  
  // Orçamentos - cache médio
  '/api/orcamentos': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  '/api/orcamentos/[id]': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  
  // SINAPI - cache longo (dados raramente mudam)
  '/api/sinapi': { ttl: CACHE_TTL.LONG, methods: ['GET'], private: false },
  
  // Configurações - cache longo
  '/api/configuracoes': { ttl: CACHE_TTL.LONG, methods: ['GET'], private: true },
  
  // Fornecedores - cache médio
  '/api/fornecedores': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  
  // Clientes - cache médio
  '/api/clientes': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  
  // Composições - cache médio
  '/api/composicoes': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  
  // Materiais - cache médio
  '/api/materiais': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  
  // Patrimônio - cache médio
  '/api/patrimonio': { ttl: CACHE_TTL.MEDIUM, methods: ['GET'], private: false },
  
  // Cronograma - cache curto
  '/api/cronograma': { ttl: CACHE_TTL.SHORT, methods: ['GET'], private: false },
  
  // Viagens - cache curto
  '/api/viagens': { ttl: CACHE_TTL.SHORT, methods: ['GET'], private: false },
  
  // Faturas - cache curto
  '/api/faturas': { ttl: CACHE_TTL.SHORT, methods: ['GET'], private: false },
};

/**
 * Gera uma chave de cache para a requisição
 */
function generateCacheKey(
  request: NextRequest,
  companyId?: string
): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;
  
  // Incluir companyId na chave se disponível
  const prefix = companyId ? `company:${companyId}` : 'public';
  
  return `api:${prefix}:${pathname}${search}`;
}

/**
 * Gera ETag para o conteúdo
 */
function generateETag(content: string): string {
  // Simples hash para ETag
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Verifica se a requisição tem If-None-Match
 */
function checkETag(request: NextRequest, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match');
  return ifNoneMatch === etag;
}

/**
 * Middleware de cache para APIs
 */
export async function withCache(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  config?: Partial<CacheConfig>
): Promise<NextResponse> {
  const cache = getCacheManager();
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  
  // Buscar configuração para esta rota
  const routeConfig = { ...CACHE_CONFIGS[pathname], ...config };
  
  // Se não configurado ou método não é GET, executar sem cache
  if (!routeConfig || !routeConfig.methods.includes(method)) {
    return handler();
  }
  
  // Se é privado e tem usuário autenticado, não cachear
  if (routeConfig.private) {
    // Verificar header de autorização
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      return handler();
    }
  }
  
  // Verificar bypass headers
  if (routeConfig.bypassHeaders) {
    for (const header of routeConfig.bypassHeaders) {
      if (request.headers.get(header)) {
        return handler();
      }
    }
  }
  
  // Extrair companyId do header ou cookie
  const companyId = request.headers.get('x-company-id') || 
    request.cookies.get('company-id')?.value;
  
  // Gerar chave de cache
  const cacheKey = generateCacheKey(request, companyId);
  
  // Verificar cache
  const cached = await cache.get<{
    body: string;
    status: number;
    headers: Record<string, string>;
    etag: string;
  }>(cacheKey);
  
  if (cached) {
    // Verificar ETag
    if (checkETag(request, cached.etag)) {
      return new NextResponse(null, { status: 304 });
    }
    
    // Retornar resposta cacheada
    const response = new NextResponse(cached.body, {
      status: cached.status,
      headers: {
        ...cached.headers,
        'ETag': cached.etag,
        'X-Cache': 'HIT',
        'Cache-Control': `max-age=${routeConfig.ttl}`,
      },
    });
    
    return response;
  }
  
  // Executar handler
  const response = await handler();
  
  // Se resposta bem sucedida, cachear
  if (response.ok && response.status >= 200 && response.status < 300) {
    const body = await response.text();
    const etag = generateETag(body);
    
    // Extrair headers relevantes
    const headers: Record<string, string> = {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    };
    
    // Salvar no cache
    await cache.set(cacheKey, {
      body,
      status: response.status,
      headers,
      etag,
    }, routeConfig.ttl);
    
    // Retornar resposta com headers de cache
    return new NextResponse(body, {
      status: response.status,
      headers: {
        ...headers,
        'ETag': etag,
        'X-Cache': 'MISS',
        'Cache-Control': `max-age=${routeConfig.ttl}`,
      },
    });
  }
  
  return response;
}

/**
 * Invalida cache de uma rota específica
 */
export async function invalidateApiCache(
  pattern: string,
  companyId?: string
): Promise<number> {
  const cache = getCacheManager();
  const keyPattern = companyId 
    ? `api:company:${companyId}:${pattern}`
    : `api:*:${pattern}`;
  
  return cache.deletePattern(keyPattern);
}

/**
 * Helper para criar resposta com cache
 */
export function cachedResponse(
  data: any,
  ttl: number = CACHE_TTL.MEDIUM,
  status: number = 200
): NextResponse {
  const body = JSON.stringify(data);
  const etag = generateETag(body);
  
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'ETag': etag,
      'Cache-Control': `max-age=${ttl}`,
    },
  });
}

/**
 * Decorator para cachear respostas de API
 */
export function CachedApi(ttl: number = CACHE_TTL.MEDIUM) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      return withCache(request, () => originalMethod.apply(this, [request, ...args]), { ttl });
    };
    
    return descriptor;
  };
}

export default withCache;
