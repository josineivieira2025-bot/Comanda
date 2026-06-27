import { emitNfceDirect } from './sefazDirect.js';

function hasFiscalCompany(settings) {
  return !!(settings?.enabled && settings.cnpj && settings.legalName && settings.cep && settings.street && settings.number && settings.city && settings.state);
}

export function fiscalReadiness(settings) {
  if (!settings?.enabled) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Ative a emissao fiscal e preencha os dados da empresa.' };
  if (!hasFiscalCompany(settings)) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Preencha CNPJ, razao social e endereco fiscal.' };
  if (!settings.provider || settings.provider === 'manual') return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Configure emissao direta SEFAZ ou um provedor fiscal real.' };
  if (settings.provider === 'sefaz_direct') {
    if (!settings.certificatePfxEncrypted || !settings.certificatePasswordEncrypted) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Envie o certificado A1 .pfx e senha.' };
    if (!settings.sefazAuthorizationUrl) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Informe a URL SOAP de autorizacao NFC-e da SEFAZ.' };
    return { ready: true, status: 'PENDING', message: 'Pronto para emissao direta em homologacao/SEFAZ.' };
  }
  if (!settings.providerToken) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Informe o token do provedor fiscal homologado.' };
  if (!settings.providerEndpoint && !['focusnfe', 'focus'].includes(settings.provider.toLowerCase())) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Informe o endpoint de emissao do provedor fiscal.' };
  return { ready: true, status: 'PENDING', message: 'Documento pronto para envio ao provedor fiscal.' };
}

async function reserveFiscalNumber(tx, settings) {
  const number = settings.nfceNextNumber;
  const series = settings.nfceSeries;
  await tx.fiscalSettings.update({
    where: { restaurantId: settings.restaurantId },
    data: { nfceNextNumber: { increment: 1 } }
  });
  return { number, series };
}

export async function createFiscalDocumentForPayment(tx, { restaurantId, payment, tabId, amount, customerCpf = null }) {
  const settings = await tx.fiscalSettings.findUnique({ where: { restaurantId } });
  if (settings && !settings.autoIssueCupom) return null;
  const readiness = fiscalReadiness(settings);
  const numbering = readiness.ready ? await reserveFiscalNumber(tx, settings) : {};
  return tx.fiscalDocument.create({
    data: {
      restaurantId,
      paymentId: payment.id,
      tabId,
      type: 'NFC_E',
      status: readiness.status,
      environment: settings?.environment || 'HOMOLOGATION',
      ...numbering,
      amount,
      customerCpf,
      errorMessage: readiness.ready ? null : readiness.message
    }
  });
}

export async function queueFiscalDocument(tx, document, settings) {
  const readiness = fiscalReadiness(settings);
  if (!readiness.ready) {
    return tx.fiscalDocument.update({
      where: { id: document.id },
      data: { status: 'NEEDS_CONFIGURATION', errorMessage: readiness.message }
    });
  }
  const numbering = document.number && document.series ? { number: document.number, series: document.series } : await reserveFiscalNumber(tx, settings);
  return tx.fiscalDocument.update({
    where: { id: document.id },
    data: {
      status: 'PENDING',
      environment: settings.environment,
      ...numbering,
      errorMessage: 'Aguardando autorizacao do provedor fiscal configurado.'
    }
  });
}

function buildFiscalPayload(document) {
  const tab = document.tab;
  const settings = document.restaurant.fiscalSettings;
  const items = (tab?.orders || []).flatMap(order => order.items).map((item, index) => ({
    numero_item: String(index + 1),
    codigo_produto: item.productId,
    descricao: item.product?.name || `Item ${index + 1}`,
    cfop: '5102',
    unidade_comercial: 'UN',
    quantidade_comercial: Number(item.quantity),
    valor_unitario_comercial: Number(item.unitPrice),
    valor_unitario_tributavel: Number(item.unitPrice),
    unidade_tributavel: 'UN',
    quantidade_tributavel: Number(item.quantity),
    valor_bruto: Number(item.unitPrice) * Number(item.quantity),
    icms_situacao_tributaria: '102',
    pis_situacao_tributaria: '49',
    cofins_situacao_tributaria: '49'
  }));
  return {
    ref: document.id,
    natureza_operacao: 'Venda ao consumidor',
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    local_destino: 1,
    finalidade_emissao: 1,
    consumidor_final: 1,
    presenca_comprador: 1,
    cnpj_emitente: settings.cnpj,
    nome_emitente: settings.legalName,
    nome_fantasia_emitente: settings.tradeName,
    logradouro_emitente: settings.street,
    numero_emitente: settings.number,
    bairro_emitente: settings.neighborhood,
    municipio_emitente: settings.city,
    uf_emitente: settings.state,
    cep_emitente: settings.cep,
    inscricao_estadual_emitente: settings.stateRegistration,
    regime_tributario_emitente: settings.taxRegime,
    cpf_destinatario: document.customerCpf || tab?.customer?.cpf || undefined,
    formas_pagamento: document.payment ? [{
      forma_pagamento: document.payment.method === 'CASH' ? '01' : document.payment.method === 'PIX' ? '17' : document.payment.method === 'CARD' ? '03' : '99',
      valor_pagamento: Number(document.payment.amount)
    }] : undefined,
    itens: items
  };
}

function providerUrl(settings, document) {
  if (settings.providerEndpoint) return settings.providerEndpoint.replace('{ref}', encodeURIComponent(document.id));
  if (['focusnfe', 'focus'].includes(settings.provider.toLowerCase())) return `https://api.focusnfe.com.br/v2/nfce?ref=${encodeURIComponent(document.id)}`;
  return null;
}

export async function emitFiscalDocument(prisma, documentId) {
  const document = await prisma.fiscalDocument.findUnique({
    where: { id: documentId },
    include: {
      restaurant: { include: { fiscalSettings: true } },
      payment: true,
      tab: { include: { customer: true, orders: { where: { status: { not: 'CANCELLED' } }, include: { items: { include: { product: true } } } } } }
    }
  });
  if (!document) return null;
  const settings = document.restaurant.fiscalSettings;
  const readiness = fiscalReadiness(settings);
  if (!readiness.ready) {
    return prisma.fiscalDocument.update({ where: { id: document.id }, data: { status: 'NEEDS_CONFIGURATION', errorMessage: readiness.message } });
  }
  if (!document.number || !document.series) {
    await prisma.$transaction(tx => queueFiscalDocument(tx, document, settings));
  }
  const fresh = await prisma.fiscalDocument.findUnique({
    where: { id: document.id },
    include: {
      restaurant: { include: { fiscalSettings: true } },
      payment: true,
      tab: { include: { customer: true, orders: { where: { status: { not: 'CANCELLED' } }, include: { items: { include: { product: true } } } } } }
    }
  });
  const url = providerUrl(settings, fresh);
  const payload = buildFiscalPayload(fresh);
  if (settings.provider === 'sefaz_direct') {
    try {
      const result = await emitNfceDirect(fresh);
      const authorized = ['100', '150'].includes(result.statusCode);
      return prisma.fiscalDocument.update({
        where: { id: fresh.id },
        data: {
          status: authorized ? 'AUTHORIZED' : 'REJECTED',
          accessKey: result.accessKey || result.key || null,
          protocol: result.protocol || null,
          requestXml: result.requestXml || null,
          responseXml: result.responseXml || null,
          issuedAt: authorized ? new Date() : null,
          errorMessage: result.reason || `SEFAZ retornou cStat ${result.statusCode || '-'}`
        }
      });
    } catch (error) {
      return prisma.fiscalDocument.update({ where: { id: fresh.id }, data: { status: 'REJECTED', errorMessage: `Falha na emissao direta SEFAZ: ${error.message}` } });
    }
  }
  const auth = ['focusnfe', 'focus'].includes(settings.provider.toLowerCase())
    ? `Basic ${Buffer.from(`${settings.providerToken}:`).toString('base64')}`
    : `Bearer ${settings.providerToken}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return prisma.fiscalDocument.update({ where: { id: fresh.id }, data: { status: 'REJECTED', errorMessage: data?.mensagem || data?.message || `Provedor fiscal recusou HTTP ${response.status}` } });
    }
    return prisma.fiscalDocument.update({
      where: { id: fresh.id },
      data: {
        status: data?.status === 'autorizado' || data?.status_sefaz === 'Autorizado' || data?.protocolo ? 'AUTHORIZED' : 'PENDING',
        accessKey: data?.chave_nfe || data?.chave || data?.accessKey || null,
        protocol: data?.protocolo || data?.protocol || null,
        xmlUrl: data?.caminho_xml_nota_fiscal || data?.xmlUrl || null,
        danfeUrl: data?.caminho_danfe || data?.danfeUrl || null,
        issuedAt: data?.protocolo || data?.chave_nfe ? new Date() : null,
        errorMessage: data?.mensagem || data?.status || 'Documento enviado ao provedor fiscal.'
      }
    });
  } catch (error) {
    return prisma.fiscalDocument.update({ where: { id: fresh.id }, data: { status: 'REJECTED', errorMessage: `Falha ao conectar no provedor fiscal: ${error.message}` } });
  }
}
