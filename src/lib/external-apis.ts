// =============================================================================
// ConstrutorPro - Integração com APIs Externas
// =============================================================================
// Serviços de integração com:
// - Receita Federal (CNPJ)
// - ViaCEP (CEP/Endereços)
// - IBGE (Localidades)
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string;
  tipo: string;
  porte: string;
  natureza_juridica: string;
  data_situacao: string | null;
  data_abertura: string | null;
  atividade_principal: {
    code: string;
    text: string;
  } | null;
  atividades_secundarias: Array<{
    code: string;
    text: string;
  }>;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  email: string | null;
  telefone: string | null;
  capital_social: string | null;
  qsa: Array<{
    nome: string;
    qual: string;
    pais_origem: string | null;
    nome_rep_legal: string | null;
    qual_rep_legal: string | null;
  }>;
  // Campos formatados para uso no sistema
  formatted?: {
    name: string;
    tradingName: string | null;
    address: string;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    email: string | null;
    phone: string | null;
    mainActivity: string | null;
  };
}

export interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  // Campos formatados
  formatted?: {
    address: string;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string;
    ibgeCode: string | null;
  };
}

export interface IBGECity {
  id: number;
  nome: string;
  microrregiao: {
    id: number;
    nome: string;
    mesorregiao: {
      id: number;
      nome: string;
      UF: {
        id: number;
        sigla: string;
        nome: string;
      };
    };
  };
}

export interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
  regiao: {
    id: number;
    sigla: string;
    nome: string;
  };
}

// -----------------------------------------------------------------------------
// CNPJ Service - Receita Federal
// -----------------------------------------------------------------------------

const CNPJ_API_URL = 'https://publica.cnpj.ws/cnpj';

/**
 * Consulta dados de CNPJ na API pública da Receita Federal
 * @param cnpj - CNPJ com ou sem formatação
 * @returns Dados do CNPJ ou erro
 */
export async function consultarCNPJ(cnpj: string): Promise<{
  success: boolean;
  data?: CNPJData;
  error?: string;
}> {
  try {
    // Remove formatação
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    // Validação básica
    if (cnpjLimpo.length !== 14) {
      return {
        success: false,
        error: 'CNPJ deve conter 14 dígitos',
      };
    }

    // Validação de dígitos verificadores
    if (!validarCNPJ(cnpjLimpo)) {
      return {
        success: false,
        error: 'CNPJ inválido',
      };
    }

    // Consulta a API
    const response = await fetch(`${CNPJ_API_URL}/${cnpjLimpo}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 404) {
      return {
        success: false,
        error: 'CNPJ não encontrado na base da Receita Federal',
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        error: 'Muitas consultas. Aguarde alguns minutos e tente novamente.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Erro ao consultar CNPJ: ${response.status}`,
      };
    }

    const data = await response.json();

    // Formatar dados para uso no sistema
    const formattedData: CNPJData = {
      ...data,
      formatted: {
        name: data.razao_social || '',
        tradingName: data.nome_fantasia || null,
        address: formatAddress(data),
        city: data.municipio || null,
        state: data.uf || null,
        zipCode: data.cep ? data.cep.replace(/\D/g, '') : null,
        email: data.email || null,
        phone: formatPhone(data.telefone),
        mainActivity: data.atividade_principal?.text || null,
      },
    };

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Timeout ao consultar CNPJ. Tente novamente.',
      };
    }

    console.error('Erro ao consultar CNPJ:', error);
    return {
      success: false,
      error: 'Erro interno ao consultar CNPJ',
    };
  }
}

// -----------------------------------------------------------------------------
// CEP Service - ViaCEP
// -----------------------------------------------------------------------------

const VIACEP_URL = 'https://viacep.com.br/ws';

/**
 * Consulta endereço por CEP via ViaCEP
 * @param cep - CEP com ou sem formatação
 * @returns Dados do endereço ou erro
 */
export async function consultarCEP(cep: string): Promise<{
  success: boolean;
  data?: CEPData;
  error?: string;
}> {
  try {
    // Remove formatação
    const cepLimpo = cep.replace(/\D/g, '');

    // Validação básica
    if (cepLimpo.length !== 8) {
      return {
        success: false,
        error: 'CEP deve conter 8 dígitos',
      };
    }

    // Consulta a API
    const response = await fetch(`${VIACEP_URL}/${cepLimpo}/json/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Erro ao consultar CEP: ${response.status}`,
      };
    }

    const data = await response.json();

    // ViaCEP retorna { erro: true } para CEP não encontrado
    if (data.erro) {
      return {
        success: false,
        error: 'CEP não encontrado',
      };
    }

    // Formatar dados
    const formattedData: CEPData = {
      ...data,
      formatted: {
        address: data.logradouro || '',
        neighborhood: data.bairro || null,
        city: data.localidade || null,
        state: data.uf || null,
        zipCode: data.cep ? data.cep.replace(/\D/g, '') : cepLimpo,
        ibgeCode: data.ibge || null,
      },
    };

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Timeout ao consultar CEP. Tente novamente.',
      };
    }

    console.error('Erro ao consultar CEP:', error);
    return {
      success: false,
      error: 'Erro interno ao consultar CEP',
    };
  }
}

// -----------------------------------------------------------------------------
// IBGE Service - Localidades
// -----------------------------------------------------------------------------

const IBGE_API_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

/**
 * Lista todos os estados do Brasil
 */
export async function listarEstados(): Promise<{
  success: boolean;
  data?: IBGEState[];
  error?: string;
}> {
  try {
    const response = await fetch(`${IBGE_API_URL}/estados`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Erro ao buscar estados: ${response.status}`,
      };
    }

    const data = await response.json();

    // Ordenar por nome
    data.sort((a: IBGEState, b: IBGEState) => a.nome.localeCompare(b.nome));

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Erro ao listar estados:', error);
    return {
      success: false,
      error: 'Erro ao carregar lista de estados',
    };
  }
}

/**
 * Lista municípios por estado
 * @param uf - Sigla do estado (ex: SP, RJ)
 */
export async function listarMunicipiosPorUF(uf: string): Promise<{
  success: boolean;
  data?: IBGECity[];
  error?: string;
}> {
  try {
    const response = await fetch(`${IBGE_API_URL}/estados/${uf}/municipios`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Erro ao buscar municípios: ${response.status}`,
      };
    }

    const data = await response.json();

    // Ordenar por nome
    data.sort((a: IBGECity, b: IBGECity) => a.nome.localeCompare(b.nome));

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Erro ao listar municípios:', error);
    return {
      success: false,
      error: 'Erro ao carregar lista de municípios',
    };
  }
}

// -----------------------------------------------------------------------------
// Document Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Valida CNPJ (dígitos verificadores)
 */
export function validarCNPJ(cnpj: string): boolean {
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  if (cnpjLimpo.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpjLimpo)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  let peso = 5;

  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }

  let digito1 = soma % 11;
  digito1 = digito1 < 2 ? 0 : 11 - digito1;

  if (parseInt(cnpjLimpo[12]) !== digito1) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  peso = 6;

  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpjLimpo[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }

  let digito2 = soma % 11;
  digito2 = digito2 < 2 ? 0 : 11 - digito2;

  return parseInt(cnpjLimpo[13]) === digito2;
}

/**
 * Valida CPF (dígitos verificadores)
 */
export function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '');

  if (cpfLimpo.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpfLimpo)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i);
  }

  let digito1 = (soma * 10) % 11;
  digito1 = digito1 === 10 ? 0 : digito1;

  if (parseInt(cpfLimpo[9]) !== digito1) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i);
  }

  let digito2 = (soma * 10) % 11;
  digito2 = digito2 === 10 ? 0 : digito2;

  return parseInt(cpfLimpo[10]) === digito2;
}

/**
 * Formata CNPJ para exibição
 */
export function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) return cnpj;
  return `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5, 8)}/${cnpjLimpo.slice(8, 12)}-${cnpjLimpo.slice(12)}`;
}

/**
 * Formata CPF para exibição
 */
export function formatarCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return cpf;
  return `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6, 9)}-${cpfLimpo.slice(9)}`;
}

/**
 * Formata CEP para exibição
 */
export function formatarCEP(cep: string): string {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return cep;
  return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
}

// -----------------------------------------------------------------------------
// Private Helpers
// -----------------------------------------------------------------------------

function formatAddress(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.logradouro) parts.push(data.logradouro as string);
  if (data.numero) parts.push(data.numero as string);
  if (data.complemento) parts.push(data.complemento as string);
  if (data.bairro) parts.push(data.bairro as string);

  return parts.join(', ');
}

function formatPhone(phone: string | null): string | null {
  if (!phone) return null;

  // Remove tudo que não é dígito
  const telefone = phone.replace(/\D/g, '');

  if (telefone.length === 10) {
    return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;
  }

  if (telefone.length === 11) {
    return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
  }

  return phone;
}

// -----------------------------------------------------------------------------
// Cache para evitar consultas repetidas
// -----------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Consulta CNPJ com cache
 */
export async function consultarCNPJComCache(cnpj: string): Promise<{
  success: boolean;
  data?: CNPJData;
  error?: string;
}> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  const cacheKey = `cnpj:${cnpjLimpo}`;

  const cached = getCached<CNPJData>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  const result = await consultarCNPJ(cnpj);

  if (result.success && result.data) {
    setCache(cacheKey, result.data);
  }

  return result;
}

/**
 * Consulta CEP com cache
 */
export async function consultarCEPComCache(cep: string): Promise<{
  success: boolean;
  data?: CEPData;
  error?: string;
}> {
  const cepLimpo = cep.replace(/\D/g, '');
  const cacheKey = `cep:${cepLimpo}`;

  const cached = getCached<CEPData>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  const result = await consultarCEP(cep);

  if (result.success && result.data) {
    setCache(cacheKey, result.data);
  }

  return result;
}
