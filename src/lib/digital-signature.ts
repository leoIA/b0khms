// =============================================================================
// ConstrutorPro - Assinatura Digital A3
// Conformidade ICP-Brasil para assinatura de documentos
// =============================================================================

import crypto from 'crypto';

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface CertificadoDigital {
  id: string;
  nome: string;
  cnpjCpf: string;
  razaoSocial: string;
  validadeInicio: Date;
  validadeFim: Date;
  emissor: string;
  tipo: 'A1' | 'A3' | 'A4';
  status: 'valido' | 'expirado' | 'revogado';
}

export interface AssinaturaDigital {
  id: string;
  documentoId: string;
  documentoTipo: 'contrato' | 'medicao' | 'nfe' | 'outro';
  assinante: {
    nome: string;
    cpfCnpj: string;
    cargo?: string;
  };
  dataAssinatura: Date;
  hashDocumento: string;
  assinatura: string;
  certificado: CertificadoDigital;
  status: 'valida' | 'invalida' | 'revogada';
}

export interface PoliticaAssinatura {
  id: string;
  nome: string;
  descricao: string;
  algoritmoHash: 'SHA256' | 'SHA512';
  formatoAssinatura: 'CMS' | 'CADES-T' | 'CADES-A';
  incluirCarimboTempo: boolean;
  incluirLCR: boolean;
}

export interface CarimboTempo {
  data: Date;
  autoridade: string;
  serialNumber: string;
  hash: string;
}

// =============================================================================
// Constantes
// =============================================================================

export const POLITICAS_ASSINATURA: Record<string, PoliticaAssinatura> = {
  AD_RB: {
    id: 'AD_RB',
    nome: 'Assinatura Digital Básica',
    descricao: 'Assinatura com referências básicas (sem carimbo de tempo)',
    algoritmoHash: 'SHA256',
    formatoAssinatura: 'CADES-T',
    incluirCarimboTempo: false,
    incluirLCR: true,
  },
  AD_RT: {
    id: 'AD_RT',
    nome: 'Assinatura Digital com Referência de Tempo',
    descricao: 'Assinatura com carimbo de tempo',
    algoritmoHash: 'SHA256',
    formatoAssinatura: 'CADES-T',
    incluirCarimboTempo: true,
    incluirLCR: true,
  },
  AD_RC: {
    id: 'AD_RC',
    nome: 'Assinatura Digital com Referência de Tempo Completa',
    descricao: 'Assinatura completa com carimbo de tempo e LCR',
    algoritmoHash: 'SHA256',
    formatoAssinatura: 'CADES-A',
    incluirCarimboTempo: true,
    incluirLCR: true,
  },
};

// =============================================================================
// Funções Principais
// =============================================================================

/**
 * Gera hash do documento para assinatura
 */
export function gerarHashDocumento(
  conteudo: string | Buffer,
  algoritmo: 'SHA256' | 'SHA512' = 'SHA256'
): string {
  const buffer = typeof conteudo === 'string' 
    ? Buffer.from(conteudo, 'utf-8')
    : conteudo;

  return crypto.createHash(algoritmo.toLowerCase().replace('sha', 'sha-'))
    .update(buffer)
    .digest('hex');
}

/**
 * Simula assinatura digital (produção real requer PKCS#11)
 * Em produção, isso seria feito pelo token/smart card A3
 */
export async function assinarDocumento(
  documento: string | Buffer,
  certificadoId: string,
  politica: PoliticaAssinatura = POLITICAS_ASSINATURA.AD_RT
): Promise<{
  hashDocumento: string;
  assinatura: string;
  carimboTempo?: CarimboTempo;
}> {
  // Gerar hash do documento
  const hashDocumento = gerarHashDocumento(documento, politica.algoritmoHash);

  // Simular assinatura (em produção, usar PKCS#11)
  // A assinatura real seria feita pelo token A3
  const assinaturaSimulada = gerarAssinaturaSimulada(hashDocumento, certificadoId);

  // Carimbo de tempo (se aplicável)
  let carimboTempo: CarimboTempo | undefined;
  if (politica.incluirCarimboTempo) {
    carimboTempo = await obterCarimboTempo(hashDocumento);
  }

  return {
    hashDocumento,
    assinatura: assinaturaSimulada,
    carimboTempo,
  };
}

/**
 * Gera assinatura simulada para desenvolvimento
 * Em produção, isso seria substituído pela integração PKCS#11
 */
function gerarAssinaturaSimulada(hash: string, certificadoId: string): string {
  const timestamp = Date.now().toString();
  const dados = `${hash}|${certificadoId}|${timestamp}`;
  
  return crypto
    .createHash('sha256')
    .update(dados)
    .digest('base64');
}

/**
 * Simula obtenção de carimbo de tempo
 * Em produção, integrar com Autoridade de Carimbo de Tempo (ACT)
 */
async function obterCarimboTempo(hash: string): Promise<CarimboTempo> {
  // Em produção, fazer requisição à ACT
  return {
    data: new Date(),
    autoridade: 'ACT ICP-Brasil',
    serialNumber: crypto.randomBytes(16).toString('hex'),
    hash: crypto.createHash('sha256').update(hash + Date.now()).digest('hex'),
  };
}

/**
 * Verifica assinatura digital
 */
export async function verificarAssinatura(
  documento: string | Buffer,
  assinatura: string,
  hashEsperado: string
): Promise<{
  valida: boolean;
  motivo?: string;
}> {
  try {
    // Gerar hash atual do documento
    const hashAtual = gerarHashDocumento(documento);

    // Verificar integridade
    if (hashAtual !== hashEsperado) {
      return {
        valida: false,
        motivo: 'Documento foi alterado após a assinatura',
      };
    }

    // Verificar formato da assinatura
    if (!assinatura || assinatura.length < 10) {
      return {
        valida: false,
        motivo: 'Assinatura inválida ou corrompida',
      };
    }

    // Em produção, verificar certificado, LCR, e carimbo de tempo
    return { valida: true };
  } catch (error) {
    return {
      valida: false,
      motivo: error instanceof Error ? error.message : 'Erro na verificação',
    };
  }
}

/**
 * Valida certificado digital
 */
export async function validarCertificado(
  certificado: CertificadoDigital
): Promise<{
  valido: boolean;
  erros: string[];
  avisos: string[];
}> {
  const erros: string[] = [];
  const avisos: string[] = [];
  const agora = new Date();

  // Verificar validade
  if (certificado.validadeFim < agora) {
    erros.push('Certificado expirado');
  }

  if (certificado.validadeInicio > agora) {
    erros.push('Certificado ainda não está válido');
  }

  // Verificar proximidade de expiração (30 dias)
  const diasParaExpirar = Math.floor(
    (certificado.validadeFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diasParaExpirar <= 30 && diasParaExpirar > 0) {
    avisos.push(`Certificado expira em ${diasParaExpirar} dias`);
  }

  // Verificar status
  if (certificado.status === 'revogado') {
    erros.push('Certificado foi revogado');
  }

  // Verificar emissor (deve ser AC ICP-Brasil)
  const emissoresValidos = [
    'ICP-Brasil',
    'Certisign',
    'Serasa',
    'Valid',
    'Soluti',
    'AC Digital',
    'Caixa',
    'BB',
  ];

  const emissorValido = emissoresValidos.some((e) =>
    certificado.emissor.toLowerCase().includes(e.toLowerCase())
  );

  if (!emissorValido) {
    avisos.push('Emissor não reconhecido como AC ICP-Brasil');
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
  };
}

/**
 * Gera XML de assinatura para NF-e
 */
export function gerarXMLAssinaturaNFe(
  xmlNFe: string,
  certificado: CertificadoDigital,
  assinatura: string
): string {
  // Extrair ID da NF-e do XML
  const idMatch = xmlNFe.match(/Id="(NFe\d{44})"/);
  const idNFe = idMatch ? idMatch[1] : '';

  // Hash do XML (apenas a tag infNFe)
  const infNFeMatch = xmlNFe.match(/<infNFe[^>]*>[\s\S]*?<\/infNFe>/);
  const infNFe = infNFeMatch ? infNFeMatch[0] : '';
  const hash = gerarHashDocumento(infNFe);

  // Valor canonicalizado (simplificado)
  const valorCanonicalizado = Buffer.from(infNFe).toString('base64');

  return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
    <Reference URI="#${idNFe}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <DigestValue>${hash}</DigestValue>
    </Reference>
  </SignedInfo>
  <SignatureValue>${assinatura}</SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>${certificado.id}</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>`;
}

/**
 * Gera representação visual da assinatura
 */
export function gerarRepresentacaoVisual(
  assinatura: AssinaturaDigital
): string {
  const data = assinatura.dataAssinatura.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ASSINATURA DIGITAL ICP-BRASIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Assinante: ${assinatura.assinante.nome}
CPF/CNPJ: ${assinatura.assinante.cpfCnpj}
${assinatura.assinante.cargo ? `Cargo: ${assinatura.assinante.cargo}` : ''}

Data/Hora: ${data}
Status: ${assinatura.status.toUpperCase()}

Hash do Documento: ${assinatura.hashDocumento.substring(0, 32)}...
ID Certificado: ${assinatura.certificado.id.substring(0, 20)}...
Emissor: ${assinatura.certificado.emissor}
Validade: ${assinatura.certificado.validadeFim.toLocaleDateString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Assinado digitalmente conforme ICP-Brasil
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Extrai informações do certificado
 * Em produção, isso seria feito pelo PKCS#11
 */
export function extrairInfoCertificado(
  certificadoBase64: string
): Partial<CertificadoDigital> {
  // Em produção, usar biblioteca como node-forge ou @peculiar/x509
  // para extrair informações reais do certificado X.509

  return {
    nome: 'Certificado Digital',
    cnpjCpf: '',
    razaoSocial: '',
    validadeInicio: new Date(),
    validadeFim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    emissor: 'ICP-Brasil',
    tipo: 'A3',
    status: 'valido',
  };
}

/**
 * Lista certificados disponíveis
 * Em produção, escaneia tokens/smart cards conectados
 */
export async function listarCertificadosDisponiveis(): Promise<CertificadoDigital[]> {
  // Em produção, usar PKCS#11 para listar certificados do token
  // Retornar lista vazia por enquanto (requer integração com hardware)
  return [];
}

/**
 * Formata CNPJ/CPF para exibição
 */
export function formatarCpfCnpj(valor: string): string {
  const limpo = valor.replace(/\D/g, '');

  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (limpo.length === 14) {
    return limpo.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }

  return valor;
}
