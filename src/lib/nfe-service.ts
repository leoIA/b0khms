// =============================================================================
// ConstrutorPro - NF-e (Nota Fiscal Eletrônica)
// Sistema completo de emissão de notas fiscais eletrônicas brasileiras
// =============================================================================

import crypto from 'crypto';

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface NFeEmitente {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  regimeTributario: '1' | '2' | '3'; // 1=Simples, 2=Simples Excesso, 3=Normal
  endereco: NFeEndereco;
}

export interface NFeDestinatario {
  cpfCnpj: string;
  razaoSocial: string;
  inscricaoEstadual?: string;
  endereco: NFeEndereco;
  email?: string;
}

export interface NFeEndereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
  codigoPais?: string;
  pais?: string;
  telefone?: string;
}

export interface NFeProduto {
  codigo: string;
  descricao: string;
  ncm: string; // Nomenclatura Comum do Mercosul
  cest?: string; // Código Especificador da Substituição Tributária
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto?: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutras?: number;
  // Tributos
  icms?: NFeICMS;
  pis?: NFePIS;
  cofins?: NFeCOFINS;
  ipi?: NFeIPI;
  // Informações adicionais
  informacoesAdicionais?: string;
}

export interface NFeICMS {
  origem: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
  cst: string; // Código de Situação Tributária
  modalidadeBC?: string;
  valorBC?: number;
  aliquota?: number;
  valor?: number;
  // Simples Nacional
  csosn?: string;
  valorBCST?: number;
  aliquotaST?: number;
  valorST?: number;
}

export interface NFePIS {
  cst: string;
  valorBC?: number;
  aliquota?: number;
  valor?: number;
}

export interface NFeCOFINS {
  cst: string;
  valorBC?: number;
  aliquota?: number;
  valor?: number;
}

export interface NFeIPI {
  cst: string;
  valorBC?: number;
  aliquota?: number;
  valor?: number;
}

export interface NFeTotais {
  baseCalculoICMS: number;
  valorICMS: number;
  baseCalculoICMSST: number;
  valorICMSST: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorII: number;
  valorIPI: number;
  valorPIS: number;
  valorCOFINS: number;
  valorOutras: number;
  valorTotal: number;
  valorServicos?: number;
  baseCalculoISSQN?: number;
  valorISSQN?: number;
}

export interface NFeTransporte {
  modalidadeFrete: '0' | '1' | '2' | '3' | '4' | '9';
  transportadora?: {
    cnpjCpf: string;
    razaoSocial: string;
    inscricaoEstadual?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
  };
  veiculo?: {
    placa: string;
    uf: string;
    rntc?: string;
  };
  volumes?: Array<{
    quantidade: number;
    especie?: string;
    marca?: string;
    numeracao?: string;
    pesoLiquido?: number;
    pesoBruto?: number;
  }>;
}

export interface NFePagamento {
  formaPagamento: '01' | '02' | '03' | '04' | '05' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21' | '22' | '23';
  valor: number;
  integracao?: '1' | '2';
  cnpjCredenciadora?: string;
  bandeira?: string;
  numeroAutorizacao?: string;
}

export interface NFeInfo {
  versao: string;
  identificador: string;
  ambiente: '1' | '2'; // 1=Produção, 2=Homologação
  serie: number;
  numero: number;
  dataEmissao: Date;
  dataSaida?: Date;
  horaSaida?: string;
  tipoOperacao: '0' | '1'; // 0=Entrada, 1=Saída
  destinoOperacao: '1' | '2' | '3'; // 1=Interna, 2=Interestadual, 3=Exterior
  consumidorFinal: '0' | '1';
  presencaComprador: '0' | '1' | '2' | '3' | '4' | '5' | '9';
  finalidadeEmissao: '1' | '2' | '3' | '4'; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  processoEmissao: '0' | '1' | '2' | '3';
  versaoProcesso: string;
}

export interface NFeDocumento {
  info: NFeInfo;
  emitente: NFeEmitente;
  destinatario: NFeDestinatario;
  produtos: NFeProduto[];
  totais: NFeTotais;
  transporte?: NFeTransporte;
  pagamentos: NFePagamento[];
  informacoesAdicionais?: string;
  informacoesComplementares?: string;
}

export interface NFeAutorizacao {
  ambiente: '1' | '2';
  versao: string;
  chaveAcesso: string;
  numeroProtocolo: string;
  dataAutorizacao: Date;
  xmlAutorizado: string;
  status: 'autorizada' | 'rejeitada' | 'denegada';
  motivo?: string;
}

export interface NFeEvento {
  tipo: 'cancelamento' | 'cartaCorrecao' | 'manifestacao';
  sequencial: number;
  dataEvento: Date;
  justificativa?: string;
  correcoes?: string;
  numeroProtocolo?: string;
}

// =============================================================================
// Constantes
// =============================================================================

export const VERSAO_NFE = '4.00';
export const VERSAO_QRCODE = '2';
export const URLS_SEFAZ = {
  // Ambiente de Homologação
  homologacao: {
    AM: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4',
    BA: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx',
    CE: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeAutorizacao4',
    GO: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4',
    MG: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
    MS: 'https://homologacao.nfe.ms.gov.br/ws/NFeAutorizacao4',
    MT: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4',
    PE: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4',
    PR: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
    RS: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    SP: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
    SVAN: 'https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
    SVRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    AN: 'https://hom.nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
  },
  // Ambiente de Produção
  producao: {
    AM: 'https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4',
    BA: 'https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx',
    CE: 'https://nfe.sefaz.ce.gov.br/nfe4/services/NFeAutorizacao4',
    GO: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4',
    MG: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
    MS: 'https://nfe.fazenda.ms.gov.br/ws/NFeAutorizacao4',
    MT: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4',
    PE: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4',
    PR: 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
    RS: 'https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    SP: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
    SVAN: 'https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
    SVRS: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    AN: 'https://www.nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
  },
};

// =============================================================================
// Funções Principais
// =============================================================================

/**
 * Gera a chave de acesso da NF-e
 */
export function gerarChaveAcesso(
  cnpjEmitente: string,
  uf: string,
  dataEmissao: Date,
  serie: number,
  numero: number,
  modelo: string = '55',
  tipoEmissao: string = '1'
): string {
  // Código numérico aleatório de 8 dígitos
  const codigoNumerico = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  
  // Formatar data (AAMM)
  const ano = dataEmissao.getFullYear().toString().slice(-2);
  const mes = (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
  const aamm = ano + mes;
  
  // Montar chave sem DV
  const chaveSemDV = [
    uf,
    aamm,
    cnpjEmitente.padStart(14, '0'),
    modelo,
    serie.toString().padStart(3, '0'),
    numero.toString().padStart(9, '0'),
    tipoEmissao,
    codigoNumerico,
  ].join('');
  
  // Calcular DV
  const dv = calcularDVChave(chaveSemDV);
  
  return chaveSemDV + dv;
}

/**
 * Calcula o dígito verificador da chave de acesso (Módulo 11)
 */
export function calcularDVChave(chave: string): string {
  let soma = 0;
  let peso = 2;
  
  for (let i = chave.length - 1; i >= 0; i--) {
    const digito = parseInt(chave[i], 10);
    soma += digito * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  
  return dv.toString();
}

/**
 * Gera o XML da NF-e
 */
export function gerarXMLNFe(nfe: NFeDocumento, chaveAcesso: string): string {
  const dataEmissao = formatDateNFe(nfe.info.dataEmissao);
  const dataSaida = nfe.info.dataSaida ? formatDateNFe(nfe.info.dataSaida) : '';
  const horaSaida = nfe.info.horaSaida || '';
  
  // Montar XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chaveAcesso}" versao="${VERSAO_NFE}">
    <ide>
      <cUF>${obterCodigoUF(nfe.emitente.endereco.uf)}</cUF>
      <cNF>${chaveAcesso.slice(-8)}</cNF>
      <natOp>VENDA</natOp>
      <mod>55</mod>
      <serie>${nfe.info.serie}</serie>
      <nNF>${nfe.info.numero}</nNF>
      <dhEmi>${dataEmissao}</dhEmi>
      ${dataSaida ? `<dhSaiEnt>${dataSaida}T${horaSaida}:00-03:00</dhSaiEnt>` : ''}
      <tpNF>${nfe.info.tipoOperacao}</tpNF>
      <idDest>${nfe.info.destinoOperacao}</idDest>
      <cMunFG>${nfe.emitente.endereco.codigoMunicipio}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>${nfe.info.processoEmissao === '0' ? '1' : '5'}</tpEmis>
      <cDV>${chaveAcesso.slice(-1)}</cDV>
      <tpAmb>${nfe.info.ambiente}</tpAmb>
      <finNFe>${nfe.info.finalidadeEmissao}</finNFe>
      <indFinal>${nfe.info.consumidorFinal}</indFinal>
      <indPres>${nfe.info.presencaComprador}</indPres>
      <procEmi>${nfe.info.processoEmissao}</procEmi>
      <verProc>${nfe.info.versaoProcesso}</verProc>
    </ide>
    <emit>
      <CNPJ>${nfe.emitente.cnpj}</CNPJ>
      <xNome>${escapeXML(nfe.emitente.razaoSocial)}</xNome>
      ${nfe.emitente.nomeFantasia ? `<xFant>${escapeXML(nfe.emitente.nomeFantasia)}</xFant>` : ''}
      <enderEmit>
        <xLgr>${escapeXML(nfe.emitente.endereco.logradouro)}</xLgr>
        <nro>${escapeXML(nfe.emitente.endereco.numero)}</nro>
        ${nfe.emitente.endereco.complemento ? `<xCpl>${escapeXML(nfe.emitente.endereco.complemento)}</xCpl>` : ''}
        <xBairro>${escapeXML(nfe.emitente.endereco.bairro)}</xBairro>
        <cMun>${nfe.emitente.endereco.codigoMunicipio}</cMun>
        <xMun>${escapeXML(nfe.emitente.endereco.municipio)}</xMun>
        <UF>${nfe.emitente.endereco.uf}</UF>
        <CEP>${nfe.emitente.endereco.cep.replace(/\D/g, '')}</CEP>
        ${nfe.emitente.endereco.codigoPais ? `<cPais>${nfe.emitente.endereco.codigoPais}</cPais>` : ''}
        ${nfe.emitente.endereco.pais ? `<xPais>${escapeXML(nfe.emitente.endereco.pais)}</xPais>` : ''}
        ${nfe.emitente.endereco.telefone ? `<fone>${nfe.emitente.endereco.telefone.replace(/\D/g, '')}</fone>` : ''}
      </enderEmit>
      <IE>${nfe.emitente.inscricaoEstadual}</IE>
      ${nfe.emitente.inscricaoMunicipal ? `<IM>${nfe.emitente.inscricaoMunicipal}</IM>` : ''}
      <CRT>${nfe.emitente.regimeTributario}</CRT>
    </emit>
    <dest>
      ${nfe.destinatario.cpfCnpj.length > 11 
        ? `<CNPJ>${nfe.destinatario.cpfCnpj}</CNPJ>` 
        : `<CPF>${nfe.destinatario.cpfCnpj}</CPF>`}
      <xNome>${escapeXML(nfe.destinatario.razaoSocial)}</xNome>
      <enderDest>
        <xLgr>${escapeXML(nfe.destinatario.endereco.logradouro)}</xLgr>
        <nro>${escapeXML(nfe.destinatario.endereco.numero)}</nro>
        ${nfe.destinatario.endereco.complemento ? `<xCpl>${escapeXML(nfe.destinatario.endereco.complemento)}</xCpl>` : ''}
        <xBairro>${escapeXML(nfe.destinatario.endereco.bairro)}</xBairro>
        <cMun>${nfe.destinatario.endereco.codigoMunicipio}</cMun>
        <xMun>${escapeXML(nfe.destinatario.endereco.municipio)}</xMun>
        <UF>${nfe.destinatario.endereco.uf}</UF>
        <CEP>${nfe.destinatario.endereco.cep.replace(/\D/g, '')}</CEP>
        ${nfe.destinatario.endereco.codigoPais ? `<cPais>${nfe.destinatario.endereco.codigoPais}</cPais>` : ''}
        ${nfe.destinatario.endereco.pais ? `<xPais>${escapeXML(nfe.destinatario.endereco.pais)}</xPais>` : ''}
      </enderDest>
      ${nfe.destinatario.inscricaoEstadual ? `<IE>${nfe.destinatario.inscricaoEstadual}</IE>` : '<indIEDest>9</indIEDest>'}
      ${nfe.destinatario.email ? `<email>${escapeXML(nfe.destinatario.email)}</email>` : ''}
    </dest>`;

  // Adicionar produtos
  nfe.produtos.forEach((produto, index) => {
    xml += gerarXMLProduto(produto, index + 1);
  });

  // Total
  xml += `
    <total>
      <ICMSTot>
        <vBC>${nfe.totais.baseCalculoICMS.toFixed(2)}</vBC>
        <vICMS>${nfe.totais.valorICMS.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>${nfe.totais.baseCalculoICMSST.toFixed(2)}</vBCST>
        <vST>${nfe.totais.valorICMSST.toFixed(2)}</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${nfe.totais.valorProdutos.toFixed(2)}</vProd>
        <vFrete>${nfe.totais.valorFrete.toFixed(2)}</vFrete>
        <vSeg>${nfe.totais.valorSeguro.toFixed(2)}</vSeg>
        <vDesc>${nfe.totais.valorDesconto.toFixed(2)}</vDesc>
        <vII>${nfe.totais.valorII.toFixed(2)}</vII>
        <vIPI>${nfe.totais.valorIPI.toFixed(2)}</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${nfe.totais.valorPIS.toFixed(2)}</vPIS>
        <vCOFINS>${nfe.totais.valorCOFINS.toFixed(2)}</vCOFINS>
        <vOutro>${nfe.totais.valorOutras.toFixed(2)}</vOutro>
        <vNF>${nfe.totais.valorTotal.toFixed(2)}</vNF>
      </ICMSTot>
    </total>`;

  // Transporte
  if (nfe.transporte) {
    xml += gerarXMLTransporte(nfe.transporte);
  }

  // Pagamentos
  xml += `
    <pag>`;
  
  nfe.pagamentos.forEach((pag) => {
    xml += `
      <detPag>
        <tPag>${pag.formaPagamento}</tPag>
        <vPag>${pag.valor.toFixed(2)}</vPag>
      </detPag>`;
  });
  
  xml += `
    </pag>`;

  // Informações adicionais
  if (nfe.informacoesAdicionais || nfe.informacoesComplementares) {
    xml += `
    <infAdic>
      ${nfe.informacoesAdicionais ? `<infAdFisco>${escapeXML(nfe.informacoesAdicionais)}</infAdFisco>` : ''}
      ${nfe.informacoesComplementares ? `<infCpl>${escapeXML(nfe.informacoesComplementares)}</infCpl>` : ''}
    </infAdic>`;
  }

  xml += `
  </infNFe>
</NFe>`;

  return xml;
}

/**
 * Gera XML do produto
 */
function gerarXMLProduto(produto: NFeProduto, numero: number): string {
  let xml = `
    <det nItem="${numero}">
      <prod>
        <cProd>${escapeXML(produto.codigo)}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${escapeXML(produto.descricao)}</xProd>
        <NCM>${produto.ncm}</NCM>
        ${produto.cest ? `<CEST>${produto.cest}</CEST>` : ''}
        <CFOP>${produto.cfop}</CFOP>
        <uCom>${escapeXML(produto.unidade)}</uCom>
        <qCom>${produto.quantidade.toFixed(4)}</qCom>
        <vUnCom>${produto.valorUnitario.toFixed(10)}</vUnCom>
        <vProd>${produto.valorTotal.toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${escapeXML(produto.unidade)}</uTrib>
        <qTrib>${produto.quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${produto.valorUnitario.toFixed(10)}</vUnTrib>
        ${produto.valorFrete ? `<vFrete>${produto.valorFrete.toFixed(2)}</vFrete>` : ''}
        ${produto.valorSeguro ? `<vSeg>${produto.valorSeguro.toFixed(2)}</vSeg>` : ''}
        ${produto.valorDesconto ? `<vDesc>${produto.valorDesconto.toFixed(2)}</vDesc>` : ''}
        ${produto.valorOutras ? `<vOutro>${produto.valorOutras.toFixed(2)}</vOutro>` : ''}
      </prod>
      <imposto>
        <vTotTrib>0.00</vTotTrib>`;

  // ICMS
  if (produto.icms) {
    xml += gerarXMLICMS(produto.icms);
  }

  // PIS
  if (produto.pis) {
    xml += gerarXMLPIS(produto.pis);
  }

  // COFINS
  if (produto.cofins) {
    xml += gerarXMLCOFINS(produto.cofins);
  }

  // IPI
  if (produto.ipi) {
    xml += gerarXMLIPI(produto.ipi);
  }

  xml += `
      </imposto>
      ${produto.informacoesAdicionais ? `<infAdProd>${escapeXML(produto.informacoesAdicionais)}</infAdProd>` : ''}
    </det>`;

  return xml;
}

/**
 * Gera XML do ICMS
 */
function gerarXMLICMS(icms: NFeICMS): string {
  // Simples Nacional
  if (icms.csosn) {
    return `
        <ICMS>
          <ICMSSN${icms.csosn}>
            <orig>${icms.origem}</orig>
            <CSOSN>${icms.csosn}</CSOSN>
          </ICMSSN${icms.csosn}>
        </ICMS>`;
  }

  // Regime Normal
  return `
        <ICMS>
          <ICMS${icms.cst}>
            <orig>${icms.origem}</orig>
            <CST>${icms.cst}</CST>
            ${icms.modalidadeBC ? `<modBC>${icms.modalidadeBC}</modBC>` : ''}
            ${icms.valorBC !== undefined ? `<vBC>${icms.valorBC.toFixed(2)}</vBC>` : ''}
            ${icms.aliquota !== undefined ? `<pICMS>${icms.aliquota.toFixed(2)}</pICMS>` : ''}
            ${icms.valor !== undefined ? `<vICMS>${icms.valor.toFixed(2)}</vICMS>` : ''}
          </ICMS${icms.cst}>
        </ICMS>`;
}

/**
 * Gera XML do PIS
 */
function gerarXMLPIS(pis: NFePIS): string {
  return `
        <PIS>
          <PISAliq>
            <CST>${pis.cst}</CST>
            ${pis.valorBC !== undefined ? `<vBC>${pis.valorBC.toFixed(2)}</vBC>` : ''}
            ${pis.aliquota !== undefined ? `<pPIS>${pis.aliquota.toFixed(2)}</pPIS>` : ''}
            ${pis.valor !== undefined ? `<vPIS>${pis.valor.toFixed(2)}</vPIS>` : ''}
          </PISAliq>
        </PIS>`;
}

/**
 * Gera XML do COFINS
 */
function gerarXMLCOFINS(cofins: NFeCOFINS): string {
  return `
        <COFINS>
          <COFINSAliq>
            <CST>${cofins.cst}</CST>
            ${cofins.valorBC !== undefined ? `<vBC>${cofins.valorBC.toFixed(2)}</vBC>` : ''}
            ${cofins.aliquota !== undefined ? `<pCOFINS>${cofins.aliquota.toFixed(2)}</pCOFINS>` : ''}
            ${cofins.valor !== undefined ? `<vCOFINS>${cofins.valor.toFixed(2)}</vCOFINS>` : ''}
          </COFINSAliq>
        </COFINS>`;
}

/**
 * Gera XML do IPI
 */
function gerarXMLIPI(ipi: NFeIPI): string {
  return `
        <IPI>
          <cEnq>999</cEnq>
          <IPITrib>
            <CST>${ipi.cst}</CST>
            ${ipi.valorBC !== undefined ? `<vBC>${ipi.valorBC.toFixed(2)}</vBC>` : ''}
            ${ipi.aliquota !== undefined ? `<pIPI>${ipi.aliquota.toFixed(2)}</pIPI>` : ''}
            ${ipi.valor !== undefined ? `<vIPI>${ipi.valor.toFixed(2)}</vIPI>` : ''}
          </IPITrib>
        </IPI>`;
}

/**
 * Gera XML do transporte
 */
function gerarXMLTransporte(transporte: NFeTransporte): string {
  let xml = `
    <transp>
      <modFrete>${transporte.modalidadeFrete}</modFrete>`;

  if (transporte.transportadora) {
    xml += `
      <transporta>
        ${transporte.transportadora.cnpjCpf.length > 11 
          ? `<CNPJ>${transporte.transportadora.cnpjCpf}</CNPJ>` 
          : `<CPF>${transporte.transportadora.cnpjCpf}</CPF>`}
        <xNome>${escapeXML(transporte.transportadora.razaoSocial)}</xNome>
        ${transporte.transportadora.inscricaoEstadual ? `<IE>${transporte.transportadora.inscricaoEstadual}</IE>` : ''}
        ${transporte.transportadora.endereco ? `<xEnder>${escapeXML(transporte.transportadora.endereco)}</xEnder>` : ''}
        ${transporte.transportadora.municipio ? `<xMun>${escapeXML(transporte.transportadora.municipio)}</xMun>` : ''}
        ${transporte.transportadora.uf ? `<UF>${transporte.transportadora.uf}</UF>` : ''}
      </transporta>`;
  }

  if (transporte.veiculo) {
    xml += `
      <veicTransp>
        <placa>${transporte.veiculo.placa}</placa>
        <UF>${transporte.veiculo.uf}</UF>
        ${transporte.veiculo.rntc ? `<RNTC>${transporte.veiculo.rntc}</RNTC>` : ''}
      </veicTransp>`;
  }

  if (transporte.volumes && transporte.volumes.length > 0) {
    transporte.volumes.forEach((vol) => {
      xml += `
      <vol>
        <qVol>${vol.quantidade}</qVol>
        ${vol.especie ? `<esp>${escapeXML(vol.especie)}</esp>` : ''}
        ${vol.marca ? `<marca>${escapeXML(vol.marca)}</marca>` : ''}
        ${vol.numeracao ? `<nVol>${escapeXML(vol.numeracao)}</nVol>` : ''}
        ${vol.pesoLiquido !== undefined ? `<pesoL>${vol.pesoLiquido.toFixed(3)}</pesoL>` : ''}
        ${vol.pesoBruto !== undefined ? `<pesoB>${vol.pesoBruto.toFixed(3)}</pesoB>` : ''}
      </vol>`;
    });
  }

  xml += `
    </transp>`;

  return xml;
}

/**
 * Gera o XML de evento de cancelamento
 */
export function gerarXMLEventoCancelamento(
  chaveAcesso: string,
  protocolo: string,
  justificativa: string,
  sequencial: number = 1
): string {
  const dataEvento = new Date();
  const idEvento = `ID110111${chaveAcesso}${sequencial.toString().padStart(2, '0')}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <idLote>${Date.now()}</idLote>
  <evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="${idEvento}">
      <cOrgao>91</cOrgao>
      <tpAmb>2</tpAmb>
      <CNPJ>${chaveAcesso.slice(6, 20)}</CNPJ>
      <chNFe>${chaveAcesso}</chNFe>
      <dhEvento>${formatDateNFe(dataEvento)}</dhEvento>
      <tpEvento>110111</tpEvento>
      <nSeqEvento>${sequencial}</nSeqEvento>
      <verEvento>1.00</verEvento>
      <detEvento versao="1.00">
        <descEvento>Cancelamento</descEvento>
        <nProt>${protocolo}</nProt>
        <xJust>${escapeXML(justificativa)}</xJust>
      </detEvento>
    </infEvento>
  </evento>
</envEvento>`;
}

/**
 * Gera o XML de carta de correção
 */
export function gerarXMLCartaCorrecao(
  chaveAcesso: string,
  correcoes: string,
  sequencial: number
): string {
  const dataEvento = new Date();
  const idEvento = `ID110110${chaveAcesso}${sequencial.toString().padStart(2, '0')}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <idLote>${Date.now()}</idLote>
  <evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="${idEvento}">
      <cOrgao>91</cOrgao>
      <tpAmb>2</tpAmb>
      <CNPJ>${chaveAcesso.slice(6, 20)}</CNPJ>
      <chNFe>${chaveAcesso}</chNFe>
      <dhEvento>${formatDateNFe(dataEvento)}</dhEvento>
      <tpEvento>110110</tpEvento>
      <nSeqEvento>${sequencial}</nSeqEvento>
      <verEvento>1.00</verEvento>
      <detEvento versao="1.00">
        <descEvento>Carta de Correção</descEvento>
        <xCorrecao>${escapeXML(correcoes)}</xCorrecao>
        <xCondUso>A Carta de Correção é disciplinada pelo § 1º-A do art. 7º do Convênio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularização de erro ocorrido na emissão de documento fiscal, desde que o erro não esteja relacionado com: I - as variáveis que determinam o valor do imposto tais como: base de cálculo, alíquota, diferença de preço, quantidade, valor da operação ou da prestação; II - a correção de dados cadastrais que implique mudança do remetente ou do destinatário; III - a data de emissão ou de saída.</xCondUso>
      </detEvento>
    </infEvento>
  </evento>
</envEvento>`;
}

/**
 * Gera QR Code para NF-e
 */
export function gerarQRCode(
  chaveAcesso: string,
  ambiente: '1' | '2',
  valorTotal: number,
  destinatarioCPF?: string,
  destinatarioCNPJ?: string,
  emissao: Date = new Date()
): string {
  const urlBase = ambiente === '1'
    ? 'https://www.nfe.fazenda.gov.br/consulta'
    : 'https://hom.nfe.fazenda.gov.br/consulta';

  // Hash do destinatário (SHA-1)
  let hashDest = '';
  if (destinatarioCPF || destinatarioCNPJ) {
    const doc = destinatarioCNPJ || destinatarioCPF || '';
    hashDest = crypto.createHash('sha1').update(doc).digest('hex');
  }

  // Data de emissão (DD/MM/AAAA)
  const dataEmi = `${emissao.getDate().toString().padStart(2, '0')}/${(emissao.getMonth() + 1).toString().padStart(2, '0')}/${emissao.getFullYear()}`;

  const params = new URLSearchParams({
    chNFe: chaveAcesso,
    nVersao: VERSAO_QRCODE,
    tpAmb: ambiente,
    cDest: hashDest,
    dhEmi: crypto.createHash('sha1').update(dataEmi).digest('hex'),
    vNF: valorTotal.toFixed(2),
    vICMS: '0.00',
    digVal: '',
    cIdToken: '',
    cHashQRCode: '',
  });

  return `${urlBase}?${params.toString()}`;
}

/**
 * Calcula totais da NF-e
 */
export function calcularTotais(produtos: NFeProduto[]): NFeTotais {
  const totais: NFeTotais = {
    baseCalculoICMS: 0,
    valorICMS: 0,
    baseCalculoICMSST: 0,
    valorICMSST: 0,
    valorProdutos: 0,
    valorFrete: 0,
    valorSeguro: 0,
    valorDesconto: 0,
    valorII: 0,
    valorIPI: 0,
    valorPIS: 0,
    valorCOFINS: 0,
    valorOutras: 0,
    valorTotal: 0,
  };

  for (const produto of produtos) {
    totais.valorProdutos += produto.valorTotal;
    totais.valorFrete += produto.valorFrete || 0;
    totais.valorSeguro += produto.valorSeguro || 0;
    totais.valorDesconto += produto.valorDesconto || 0;

    if (produto.icms) {
      totais.baseCalculoICMS += produto.icms.valorBC || 0;
      totais.valorICMS += produto.icms.valor || 0;
      totais.baseCalculoICMSST += produto.icms.valorBCST || 0;
      totais.valorICMSST += produto.icms.valorST || 0;
    }

    if (produto.pis) {
      totais.valorPIS += produto.pis.valor || 0;
    }

    if (produto.cofins) {
      totais.valorCOFINS += produto.cofins.valor || 0;
    }

    if (produto.ipi) {
      totais.valorIPI += produto.ipi.valor || 0;
    }

    totais.valorOutras += produto.valorOutras || 0;
  }

  totais.valorTotal = 
    totais.valorProdutos -
    totais.valorDesconto +
    totais.valorFrete +
    totais.valorSeguro +
    totais.valorOutras +
    totais.valorIPI +
    totais.valorICMSST;

  // Arredondar valores
  for (const key of Object.keys(totais) as Array<keyof NFeTotais>) {
    if (typeof totais[key] === 'number') {
      totais[key] = Math.round((totais[key] as number) * 100) / 100;
    }
  }

  return totais;
}

// =============================================================================
// Funções Auxiliares
// =============================================================================

/**
 * Formata data para o padrão da NF-e
 */
function formatDateNFe(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timezone = '-03:00'; // Brasília
  
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${timezone}`;
}

/**
 * Obtém código da UF
 */
function obterCodigoUF(uf: string): string {
  const codigos: Record<string, string> = {
    AC: '12', AL: '27', AM: '13', AP: '16', BA: '29', CE: '23',
    DF: '53', ES: '32', GO: '52', MA: '21', MG: '31', MS: '50',
    MT: '51', PA: '15', PB: '25', PE: '26', PI: '22', PR: '41',
    RJ: '33', RN: '24', RO: '11', RR: '14', RS: '43', SC: '42',
    SE: '28', SP: '35', TO: '17',
  };
  return codigos[uf.toUpperCase()] || '35';
}

/**
 * Escapa caracteres XML
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/\D/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

/**
 * Valida CPF
 */
export function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.charAt(10));
}
