// =============================================================================
// ConstrutorPro - Hooks para Consulta de APIs Externas
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CNPJResult {
  cnpj: string;
  cnpjLimpo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: string;
  tipo: string;
  porte: string;
  dataAbertura: string | null;
  atividadePrincipal: {
    code: string;
    text: string;
  } | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    municipio: string | null;
    uf: string | null;
    cep: string | null;
  };
  contato: {
    email: string | null;
    telefone: string | null;
  };
  capitalSocial: string | null;
  formatted: {
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

interface CEPResult {
  cep: string;
  cepLimpo: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  formatted: {
    address: string;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string;
    ibgeCode: string | null;
  };
}

interface ValidationResult {
  valido: boolean;
  tipo: 'cpf' | 'cnpj';
  documento: string;
  documentoLimpo: string;
  mensagem: string;
  erro?: string;
}

// -----------------------------------------------------------------------------
// Hook para Consulta de CNPJ
// -----------------------------------------------------------------------------

export function useConsultaCNPJ() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CNPJResult | null>(null);

  const consultar = useCallback(async (cnpj: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/externo/cnpj?cnpj=${encodeURIComponent(cnpj)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Erro ao consultar CNPJ');
        return null;
      }

      setData(result.data);
      return result.data as CNPJResult;
    } catch (err) {
      setError('Erro ao consultar CNPJ');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    consultar,
    loading,
    error,
    data,
    clear: () => {
      setError(null);
      setData(null);
    },
  };
}

// -----------------------------------------------------------------------------
// Hook para Consulta de CEP
// -----------------------------------------------------------------------------

export function useConsultaCEP() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CEPResult | null>(null);

  const consultar = useCallback(async (cep: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/externo/cep?cep=${encodeURIComponent(cep)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Erro ao consultar CEP');
        return null;
      }

      setData(result.data);
      return result.data as CEPResult;
    } catch (err) {
      setError('Erro ao consultar CEP');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    consultar,
    loading,
    error,
    data,
    clear: () => {
      setError(null);
      setData(null);
    },
  };
}

// -----------------------------------------------------------------------------
// Hook para Validação de Documentos
// -----------------------------------------------------------------------------

export function useValidarDocumento() {
  const [loading, setLoading] = useState(false);

  const validar = useCallback(async (documento: string, tipo?: 'cpf' | 'cnpj') => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ documento });
      if (tipo) params.set('tipo', tipo);

      const response = await fetch(`/api/externo/validar?${params.toString()}`);
      const result = await response.json();

      return result.data as ValidationResult;
    } catch (err) {
      return {
        valido: false,
        tipo: (documento.replace(/\D/g, '').length === 11 ? 'cpf' : 'cnpj') as 'cpf' | 'cnpj',
        documento,
        documentoLimpo: documento.replace(/\D/g, ''),
        mensagem: 'Erro ao validar documento',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { validar, loading };
}

// -----------------------------------------------------------------------------
// Hook para Listar Estados
// -----------------------------------------------------------------------------

export function useEstados() {
  return useQuery({
    queryKey: ['estados'],
    queryFn: async () => {
      const response = await fetch('/api/externo/estados');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as Array<{
        id: number;
        sigla: string;
        nome: string;
        regiao: string;
      }>;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 horas
  });
}

// -----------------------------------------------------------------------------
// Hook para Listar Municípios por UF
// -----------------------------------------------------------------------------

export function useMunicipios(uf: string | null) {
  return useQuery({
    queryKey: ['municipios', uf],
    queryFn: async () => {
      if (!uf) return [];

      const response = await fetch(`/api/externo/municipios?uf=${uf}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data as Array<{
        id: number;
        nome: string;
        microrregiao: string;
      }>;
    },
    enabled: !!uf,
    staleTime: 1000 * 60 * 60 * 24, // 24 horas
  });
}

// -----------------------------------------------------------------------------
// Utilitários de Formatação
// -----------------------------------------------------------------------------

export function formatarCNPJInput(value: string): string {
  const numeros = value.replace(/\D/g, '').slice(0, 14);

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
  if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
  if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
}

export function formatarCPFInput(value: string): string {
  const numeros = value.replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 3) return numeros;
  if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
  if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
}

export function formatarCEPInput(value: string): string {
  const numeros = value.replace(/\D/g, '').slice(0, 8);

  if (numeros.length <= 5) return numeros;
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
}

export function formatarTelefoneInput(value: string): string {
  const numeros = value.replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}
