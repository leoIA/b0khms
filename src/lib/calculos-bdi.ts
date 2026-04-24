// =============================================================================
// ConstrutorPro - Biblioteca de Cálculos de BDI e Encargos Sociais
// =============================================================================

/**
 * Interface para configuração de BDI
 */
export interface BDIConfig {
  pis: number;
  cofins: number;
  iss: number;
  irpj: number;
  csll: number;
  cpp: number;
  administracaoCentral: number;
  despesasFinanceiras: number;
  riscos: number;
  seguros: number;
  garantia: number;
  lucro: number;
  despesasComercializacao: number;
}

/**
 * Interface para configuração de Encargos Sociais
 */
export interface EncargosConfig {
  inssPatronal: number;
  inssRAT: number;
  inssFAP: number;
  fgts: number;
  fgtsMultaRescisoria: number;
  fgtsMultaRescisoriaSemCausa: number;
  avisoPrevioIndenizado: number;
  salarioEducacao: number;
  incra: number;
  senai: number;
  sesi: number;
  sebrae: number;
  ferias: number;
  tercoFerias: number;
  abonoFerias: number;
  decimoTerceiro: number;
  auxilioTransporte: number;
  auxilioAlimentacao: number;
}

/**
 * Resultado do cálculo de BDI
 */
export interface BDIResult {
  totalImpostos: number;
  totalBDI: number;
  breakdown: {
    impostos: number;
    administracao: number;
    riscos: number;
    lucro: number;
    comercializacao: number;
  };
}

/**
 * Resultado do cálculo de Encargos
 */
export interface EncargosResult {
  inssTotal: number;
  fgtsTotal: number;
  multaSemCausa: number;
  contribuicoesSociais: number;
  beneficiosTrabalhistas: number;
  auxilios: number;
  totalEncargosPercentual: number;
}

/**
 * Resultado do cálculo de custo de mão de obra
 */
export interface CustoMaoDeObraResult {
  salarioHora: number;
  horasTrabalho: number;
  encargosPercentual: number;
  encargosHora: number;
  custoHoraTotal: number;
  custoTotal: number;
  breakdown: {
    inss: number;
    fgts: number;
    contribuicoesSociais: number;
    beneficiosTrabalhistas: number;
    auxilios: number;
  };
}

// -----------------------------------------------------------------------------
// Cálculo de BDI
// -----------------------------------------------------------------------------

/**
 * Calcula o BDI completo a partir da configuração
 */
export function calcularBDI(config: BDIConfig): BDIResult {
  // Total de impostos
  const totalImpostos = 
    config.pis + 
    config.cofins + 
    config.iss + 
    config.irpj + 
    config.csll + 
    config.cpp;

  // BDI total
  const totalBDI = 
    totalImpostos + 
    config.administracaoCentral + 
    config.despesasFinanceiras + 
    config.riscos + 
    config.seguros + 
    config.garantia + 
    config.lucro + 
    config.despesasComercializacao;

  return {
    totalImpostos,
    totalBDI,
    breakdown: {
      impostos: totalImpostos,
      administracao: config.administracaoCentral + config.despesasFinanceiras,
      riscos: config.riscos + config.seguros + config.garantia,
      lucro: config.lucro,
      comercializacao: config.despesasComercializacao,
    },
  };
}

/**
 * Aplica BDI a um valor de custo direto
 */
export function aplicarBDI(custoDireto: number, bdiPercentual: number): {
  custoDireto: number;
  bdiValor: number;
  precoFinal: number;
} {
  const bdiValor = custoDireto * (bdiPercentual / 100);
  const precoFinal = custoDireto + bdiValor;

  return {
    custoDireto,
    bdiValor,
    precoFinal,
  };
}

/**
 * Calcula o preço de venda a partir do custo direto e BDI
 */
export function calcularPrecoVenda(
  custoDireto: number,
  config: BDIConfig
): {
  custoDireto: number;
  bdi: BDIResult;
  bdiValor: number;
  precoVenda: number;
} {
  const bdi = calcularBDI(config);
  const { bdiValor, precoFinal } = aplicarBDI(custoDireto, bdi.totalBDI);

  return {
    custoDireto,
    bdi,
    bdiValor,
    precoVenda: precoFinal,
  };
}

// -----------------------------------------------------------------------------
// Cálculo de Encargos Sociais
// -----------------------------------------------------------------------------

/**
 * Calcula os encargos sociais a partir da configuração
 */
export function calcularEncargos(config: EncargosConfig): EncargosResult {
  // INSS Patronal com RAT e FAP
  // RAT × FAP = multiplicador sobre a alíquota base
  const inssTotal = config.inssPatronal * (1 + (config.inssRAT * config.inssFAP) / 100);

  // FGTS com provisão para multa rescisória
  // Considerando rotatividade média de 10% ao ano
  const rotatividadeAnual = 0.1;
  const fgtsTotal = config.fgts + (config.fgtsMultaRescisoria * rotatividadeAnual);

  // Multa FGTS sem justa causa (proporcional)
  const taxaRescisaoSemCausa = 0.05; // 5% de chance de rescisão sem justa causa
  const multaSemCausa = config.fgtsMultaRescisoriaSemCausa * taxaRescisaoSemCausa;

  // Contribuições sociais (Sistema S)
  const contribuicoesSociais = 
    config.salarioEducacao + 
    config.incra + 
    config.senai + 
    config.sesi + 
    config.sebrae;

  // Benefícios trabalhistas
  const beneficiosTrabalhistas = 
    config.ferias + 
    config.tercoFerias + 
    config.abonoFerias + 
    config.decimoTerceiro +
    config.avisoPrevioIndenizado;

  // Auxílios
  const auxilios = config.auxilioTransporte + config.auxilioAlimentacao;

  // Total de encargos sobre o salário
  const totalEncargosPercentual = 
    inssTotal + 
    fgtsTotal + 
    multaSemCausa + 
    contribuicoesSociais + 
    beneficiosTrabalhistas + 
    auxilios;

  return {
    inssTotal,
    fgtsTotal,
    multaSemCausa,
    contribuicoesSociais,
    beneficiosTrabalhistas,
    auxilios,
    totalEncargosPercentual,
  };
}

/**
 * Calcula o custo total de mão de obra com encargos
 */
export function calcularCustoMaoDeObra(
  salarioHora: number,
  horasTrabalho: number,
  config: EncargosConfig
): CustoMaoDeObraResult {
  const encargos = calcularEncargos(config);
  const encargosPercentual = encargos.totalEncargosPercentual;

  const encargosHora = salarioHora * (encargosPercentual / 100);
  const custoHoraTotal = salarioHora + encargosHora;
  const custoTotal = custoHoraTotal * horasTrabalho;

  return {
    salarioHora,
    horasTrabalho,
    encargosPercentual,
    encargosHora,
    custoHoraTotal,
    custoTotal,
    breakdown: {
      inss: salarioHora * (encargos.inssTotal / 100),
      fgts: salarioHora * (encargos.fgtsTotal / 100),
      contribuicoesSociais: salarioHora * (encargos.contribuicoesSociais / 100),
      beneficiosTrabalhistas: salarioHora * (encargos.beneficiosTrabalhistas / 100),
      auxilios: salarioHora * (encargos.auxilios / 100),
    },
  };
}

// -----------------------------------------------------------------------------
// Valores Padrão (conforme legislação brasileira)
// -----------------------------------------------------------------------------

/**
 * Configuração padrão de BDI
 * Valores baseados em práticas de mercado para construção civil
 */
export const BDI_PADRAO: BDIConfig = {
  // Impostos
  pis: 1.65,           // PIS/PASEP - 1,65% sobre faturamento
  cofins: 7.6,         // COFINS - 7,6% sobre faturamento
  iss: 5.0,            // ISS - varia por município (média 5%)
  irpj: 4.8,           // IRPJ - 15% × 32% (lucro presumido)
  csll: 2.88,          // CSLL - 9% × 32% (lucro presumido)
  cpp: 2.33,           // CPP - contribuição previdenciária sobre folha
  // Administração
  administracaoCentral: 8.0,    // Despesas administrativas
  despesasFinanceiras: 2.0,     // Juros e taxas bancárias
  // Riscos
  riscos: 1.5,         // Fundo de reserva
  seguros: 1.0,        // Seguros (obra, RC)
  garantia: 0.5,       // Garantia da obra
  // Lucro
  lucro: 10.0,         // Margem de lucro líquido
  despesasComercializacao: 2.0, // Comissões e propaganda
};

/**
 * Configuração padrão de Encargos Sociais
 * Valores conforme legislação trabalhista brasileira
 */
export const ENCARGOS_PADRAO: EncargosConfig = {
  // INSS Patronal
  inssPatronal: 20.0,      // 20% sobre folha de pagamento
  inssRAT: 1.0,            // Risco Ambiental do Trabalho (varia por CNAE)
  inssFAP: 1.0,            // Fator Acidentário de Prevenção (varia por empresa)
  // FGTS
  fgts: 8.0,               // 8% sobre salário
  fgtsMultaRescisoria: 40.0, // 40% sobre FGTS em caso de dispensa
  fgtsMultaRescisoriaSemCausa: 10.0, // Adicional sem justa causa
  avisoPrevioIndenizado: 8.33, // 1/12 por ano de serviço
  // Contribuições Sociais (Sistema S)
  salarioEducacao: 2.5,    // 2,5% sobre folha
  incra: 0.2,              // 0,2% sobre folha
  senai: 1.0,              // 1,0% sobre folha
  sesi: 0.8,               // 0,8% sobre folha
  sebrae: 0.6,             // 0,6% sobre folha
  // Benefícios Trabalhistas
  ferias: 11.11,           // 30/270 dias
  tercoFerias: 3.70,       // 1/3 sobre férias
  abonoFerias: 0,          // Opcional
  decimoTerceiro: 8.33,    // 1/12 por mês
  // Auxílios
  auxilioTransporte: 6.0,  // Vale-transporte
  auxilioAlimentacao: 3.0, // Vale-alimentação (opcional)
};

// -----------------------------------------------------------------------------
// Utilitários
// -----------------------------------------------------------------------------

/**
 * Formata valor para exibição em moeda brasileira
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata percentual para exibição
 */
export function formatarPercentual(valor: number, decimais: number = 2): string {
  return `${valor.toFixed(decimais)}%`;
}

/**
 * Calcula o custo total de uma composição com encargos
 */
export function calcularCustoComposicao(
  custoMateriais: number,
  horasMaoDeObra: number,
  salarioHora: number,
  configEncargos: EncargosConfig
): {
  custoMateriais: number;
  custoMaoDeObra: number;
  custoTotal: number;
} {
  const maoDeObra = calcularCustoMaoDeObra(salarioHora, horasMaoDeObra, configEncargos);
  
  return {
    custoMateriais,
    custoMaoDeObra: maoDeObra.custoTotal,
    custoTotal: custoMateriais + maoDeObra.custoTotal,
  };
}
