function hasFiscalCompany(settings) {
  return !!(settings?.enabled && settings.cnpj && settings.legalName && settings.cep && settings.street && settings.number && settings.city && settings.state);
}

export function fiscalReadiness(settings) {
  if (!settings?.enabled) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Ative a emissao fiscal e preencha os dados da empresa.' };
  if (!hasFiscalCompany(settings)) return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Preencha CNPJ, razao social e endereco fiscal.' };
  if (!settings.providerToken && settings.provider !== 'manual') return { ready: false, status: 'NEEDS_CONFIGURATION', message: 'Informe o token do provedor fiscal homologado.' };
  return { ready: true, status: 'PENDING', message: 'Documento pronto para envio ao provedor fiscal.' };
}

export async function createFiscalDocumentForPayment(tx, { restaurantId, payment, tabId, amount, customerCpf = null }) {
  const settings = await tx.fiscalSettings.findUnique({ where: { restaurantId } });
  if (settings && !settings.autoIssueCupom) return null;
  const readiness = fiscalReadiness(settings);
  return tx.fiscalDocument.create({
    data: {
      restaurantId,
      paymentId: payment.id,
      tabId,
      type: 'NFC_E',
      status: readiness.status,
      environment: settings?.environment || 'HOMOLOGATION',
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
  const number = settings.nfceNextNumber;
  const series = settings.nfceSeries;
  await tx.fiscalSettings.update({
    where: { restaurantId: settings.restaurantId },
    data: { nfceNextNumber: { increment: 1 } }
  });
  return tx.fiscalDocument.update({
    where: { id: document.id },
    data: {
      status: 'PENDING',
      environment: settings.environment,
      series,
      number,
      errorMessage: 'Aguardando autorizacao do provedor fiscal configurado.'
    }
  });
}
