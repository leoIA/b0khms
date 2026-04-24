// =============================================================================
// ConstrutorPro - Testes do Serviço de Integração com APIs Externas
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validarCNPJ,
  validarCPF,
  formatarCNPJ,
  formatarCPF,
  formatarCEP,
  consultarCNPJ,
  consultarCEP,
  listarEstados,
  listarMunicipiosPorUF,
} from '../external-apis';

// -----------------------------------------------------------------------------
// Validação de CNPJ
// -----------------------------------------------------------------------------

describe('validarCNPJ', () => {
  it('deve validar CNPJ correto', () => {
    // CNPJ válido conhecido (Receita Federal)
    expect(validarCNPJ('11222333000181')).toBe(true);
  });

  it('deve rejeitar CNPJ com todos dígitos iguais', () => {
    expect(validarCNPJ('11111111111111')).toBe(false);
    expect(validarCNPJ('22222222222222')).toBe(false);
    expect(validarCNPJ('00000000000000')).toBe(false);
  });

  it('deve rejeitar CNPJ com dígitos verificadores incorretos', () => {
    expect(validarCNPJ('11222333000182')).toBe(false);
    expect(validarCNPJ('11222333000100')).toBe(false);
  });

  it('deve rejeitar CNPJ com tamanho incorreto', () => {
    expect(validarCNPJ('1122233300018')).toBe(false); // 13 dígitos
    expect(validarCNPJ('112223330001811')).toBe(false); // 15 dígitos
  });

  it('deve aceitar CNPJ com formatação', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('deve rejeitar CNPJ vazio', () => {
    expect(validarCNPJ('')).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Validação de CPF
// -----------------------------------------------------------------------------

describe('validarCPF', () => {
  it('deve validar CPF correto', () => {
    // CPF válido conhecido (gerado para testes)
    expect(validarCPF('52998224725')).toBe(true);
    expect(validarCPF('12345678909')).toBe(true);
  });

  it('deve rejeitar CPF com todos dígitos iguais', () => {
    expect(validarCPF('11111111111')).toBe(false);
    expect(validarCPF('22222222222')).toBe(false);
    expect(validarCPF('00000000000')).toBe(false);
  });

  it('deve rejeitar CPF com dígitos verificadores incorretos', () => {
    expect(validarCPF('52998224726')).toBe(false);
    expect(validarCPF('12345678900')).toBe(false);
  });

  it('deve rejeitar CPF com tamanho incorreto', () => {
    expect(validarCPF('1234567890')).toBe(false); // 10 dígitos
    expect(validarCPF('123456789012')).toBe(false); // 12 dígitos
  });

  it('deve aceitar CPF com formatação', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
  });

  it('deve rejeitar CPF vazio', () => {
    expect(validarCPF('')).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Formatação de Documentos
// -----------------------------------------------------------------------------

describe('formatarCNPJ', () => {
  it('deve formatar CNPJ corretamente', () => {
    expect(formatarCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('deve retornar original se tamanho incorreto', () => {
    expect(formatarCNPJ('123')).toBe('123');
    expect(formatarCNPJ('112223330001811')).toBe('112223330001811');
  });

  it('deve ignorar caracteres não numéricos', () => {
    expect(formatarCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });
});

describe('formatarCPF', () => {
  it('deve formatar CPF corretamente', () => {
    expect(formatarCPF('52998224725')).toBe('529.982.247-25');
  });

  it('deve retornar original se tamanho incorreto', () => {
    expect(formatarCPF('123')).toBe('123');
    expect(formatarCPF('123456789012')).toBe('123456789012');
  });

  it('deve ignorar caracteres não numéricos', () => {
    expect(formatarCPF('529.982.247-25')).toBe('529.982.247-25');
  });
});

describe('formatarCEP', () => {
  it('deve formatar CEP corretamente', () => {
    expect(formatarCEP('01310100')).toBe('01310-100');
  });

  it('deve retornar original se tamanho incorreto', () => {
    expect(formatarCEP('123')).toBe('123');
    expect(formatarCEP('123456789')).toBe('123456789');
  });
});

// -----------------------------------------------------------------------------
// Consulta de CNPJ (Mock)
// -----------------------------------------------------------------------------

describe('consultarCNPJ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar erro para CNPJ com tamanho incorreto', async () => {
    const result = await consultarCNPJ('123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('14 dígitos');
  });

  it('deve retornar erro para CNPJ inválido', async () => {
    const result = await consultarCNPJ('11111111111111');
    expect(result.success).toBe(false);
    expect(result.error).toContain('inválido');
  });

  it('deve retornar erro para CNPJ não encontrado', async () => {
    // Mock do fetch para retornar 404
    global.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    });

    const result = await consultarCNPJ('11222333000181');
    expect(result.success).toBe(false);
    expect(result.error).toContain('não encontrado');
  });

  it('deve lidar com rate limiting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
    });

    const result = await consultarCNPJ('11222333000181');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Muitas consultas');
  });
});

// -----------------------------------------------------------------------------
// Consulta de CEP (Mock)
// -----------------------------------------------------------------------------

describe('consultarCEP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar erro para CEP com tamanho incorreto', async () => {
    const result = await consultarCEP('123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('8 dígitos');
  });

  it('deve retornar erro para CEP não encontrado', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ erro: true }),
    });

    const result = await consultarCEP('00000000');
    expect(result.success).toBe(false);
    expect(result.error).toContain('não encontrado');
  });

  it('deve retornar dados formatados para CEP válido', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
        ibge: '3550308',
        gia: '1004',
        ddd: '11',
        siafi: '7107',
      }),
    });

    const result = await consultarCEP('01310100');
    expect(result.success).toBe(true);
    expect(result.data?.formatted?.address).toBe('Avenida Paulista');
    expect(result.data?.formatted?.city).toBe('São Paulo');
    expect(result.data?.formatted?.state).toBe('SP');
  });
});

// -----------------------------------------------------------------------------
// Listar Estados (Mock)
// -----------------------------------------------------------------------------

describe('listarEstados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar lista de estados', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [
        { id: 35, sigla: 'SP', nome: 'São Paulo', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } },
        { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } },
      ],
    });

    const result = await listarEstados();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    // Verificar se está ordenado por nome
    expect(result.data?.[0].nome).toBe('Rio de Janeiro');
    expect(result.data?.[1].nome).toBe('São Paulo');
  });

  it('deve retornar erro em caso de falha na API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    });

    const result = await listarEstados();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Erro ao buscar estados');
  });
});

// -----------------------------------------------------------------------------
// Listar Municípios (Mock)
// -----------------------------------------------------------------------------

describe('listarMunicipiosPorUF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar lista de municípios', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [
        {
          id: 3550308,
          nome: 'São Paulo',
          microrregiao: { id: 3501, nome: 'São Paulo' },
        },
        {
          id: 3524402,
          nome: 'Campinas',
          microrregiao: { id: 3502, nome: 'Campinas' },
        },
      ],
    });

    const result = await listarMunicipiosPorUF('SP');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    // Verificar se está ordenado por nome
    expect(result.data?.[0].nome).toBe('Campinas');
    expect(result.data?.[1].nome).toBe('São Paulo');
  });

  it('deve retornar erro em caso de falha na API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    });

    const result = await listarMunicipiosPorUF('SP');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Erro ao buscar municípios');
  });
});

// -----------------------------------------------------------------------------
// Edge Cases
// -----------------------------------------------------------------------------

describe('Edge Cases', () => {
  it('deve lidar com CNPJ com caracteres especiais', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true);
    expect(validarCNPJ('11-222-333-0001-81')).toBe(true);
    expect(validarCNPJ('11 222 333 0001 81')).toBe(true);
  });

  it('deve lidar com CPF com caracteres especiais', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
    expect(validarCPF('529-982-247-25')).toBe(true);
    expect(validarCPF('529 982 247 25')).toBe(true);
  });

  it('deve lidar com CEP com caracteres especiais', () => {
    expect(formatarCEP('01310-100')).toBe('01310-100');
    expect(formatarCEP('01310 100')).toBe('01310-100');
  });

  it('deve lidar com timeout na consulta', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        const error = new Error('Timeout');
        error.name = 'TimeoutError';
        setTimeout(() => reject(error), 10);
      });
    });

    global.AbortSignal = {
      timeout: () => new AbortController().signal,
    } as unknown as typeof AbortSignal;

    const result = await consultarCEP('01310100');
    expect(result.success).toBe(false);
  });
});
