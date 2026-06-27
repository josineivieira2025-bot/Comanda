import crypto from 'node:crypto';
import https from 'node:https';
import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { decryptBuffer, decryptText } from './cryptoBox.js';

const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';
const SOAP_NS = 'http://www.w3.org/2003/05/soap-envelope';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function decimal4(value) {
  return Number(value || 0).toFixed(4);
}

function xmlEscape(value) {
  return String(value ?? '').replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);
}

function tag(name, value) {
  if (value === undefined || value === null || value === '') return '';
  return `<${name}>${xmlEscape(value)}</${name}>`;
}

function pfxToPem(pfxBuffer, passphrase) {
  const p12Der = forge.util.decode64(pfxBuffer.toString('base64'));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase || '');
  const keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
  if (!keyBag?.key || !certBag?.cert) throw new Error('Certificado A1 invalido ou senha incorreta.');
  return {
    privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
    certificatePem: forge.pki.certificateToPem(certBag.cert),
    certificateDerBase64: forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert)).getBytes()),
    subject: certBag.cert.subject.attributes.map(attr => `${attr.shortName || attr.name}=${attr.value}`).join(', '),
    serial: certBag.cert.serialNumber,
    expiresAt: certBag.cert.validity.notAfter
  };
}

export function inspectPfx({ pfxBase64, password }) {
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  const parsed = pfxToPem(pfxBuffer, password);
  return { subject: parsed.subject, serial: parsed.serial, expiresAt: parsed.expiresAt };
}

function modulo11(value) {
  let weight = 2;
  let sum = 0;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    sum += Number(value[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

function accessKey({ stateCode, date, cnpj, model, series, number, emissionType, numericCode }) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const base = `${stateCode}${yy}${mm}${cnpj.padStart(14, '0')}${model}${String(series).padStart(3, '0')}${String(number).padStart(9, '0')}${emissionType}${numericCode}`;
  return `${base}${modulo11(base)}`;
}

function buildItems(tab) {
  return (tab?.orders || []).flatMap(order => order.items || []).map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const total = quantity * unitPrice;
    return `<det nItem="${index + 1}">
      <prod>
        ${tag('cProd', item.productId || index + 1)}
        ${tag('cEAN', 'SEM GTIN')}
        ${tag('xProd', item.product?.name || `Item ${index + 1}`)}
        ${tag('NCM', item.product?.ncm || '21069090')}
        ${tag('CFOP', '5102')}
        ${tag('uCom', 'UN')}
        ${tag('qCom', decimal4(quantity))}
        ${tag('vUnCom', decimal4(unitPrice))}
        ${tag('vProd', money(total))}
        ${tag('cEANTrib', 'SEM GTIN')}
        ${tag('uTrib', 'UN')}
        ${tag('qTrib', decimal4(quantity))}
        ${tag('vUnTrib', decimal4(unitPrice))}
        ${tag('indTot', '1')}
      </prod>
      <imposto>
        <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
        <PIS><PISOutr><CST>49</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>
        <COFINS><COFINSOutr><CST>49</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>
      </imposto>
    </det>`;
  });
}

function buildNfceXml(document, settings) {
  const now = new Date();
  const stateCode = settings.sefazStateCode || '13';
  const cnpj = onlyDigits(settings.cnpj);
  const model = '65';
  const series = document.series || settings.nfceSeries || 1;
  const number = document.number || settings.nfceNextNumber || 1;
  const numericCode = crypto.randomInt(1, 99999999).toString().padStart(8, '0');
  const key = accessKey({ stateCode, date: now, cnpj, model, series, number, emissionType: '1', numericCode });
  const tab = document.tab;
  const items = buildItems(tab);
  const subtotal = items.length ? (tab.orders || []).flatMap(order => order.items || []).reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0) : Number(document.amount || 0);
  const total = Number(document.amount || subtotal);
  const paymentCode = document.payment?.method === 'CASH' ? '01' : document.payment?.method === 'PIX' ? '17' : document.payment?.method === 'CARD' ? '03' : '99';
  return {
    key,
    xml: `<NFe xmlns="${NFE_NS}">
      <infNFe Id="NFe${key}" versao="4.00">
        <ide>
          ${tag('cUF', stateCode)}${tag('cNF', numericCode)}${tag('natOp', 'VENDA AO CONSUMIDOR')}${tag('mod', model)}
          ${tag('serie', series)}${tag('nNF', number)}${tag('dhEmi', now.toISOString())}${tag('tpNF', '1')}${tag('idDest', '1')}
          ${tag('cMunFG', `${stateCode}02553`)}${tag('tpImp', '4')}${tag('tpEmis', '1')}${tag('cDV', key.slice(-1))}
          ${tag('tpAmb', settings.environment === 'PRODUCTION' ? '1' : '2')}${tag('finNFe', '1')}${tag('indFinal', '1')}${tag('indPres', '1')}${tag('procEmi', '0')}${tag('verProc', 'orbe-1.0')}
        </ide>
        <emit>
          ${tag('CNPJ', cnpj)}${tag('xNome', settings.legalName)}${tag('xFant', settings.tradeName || settings.legalName)}
          <enderEmit>${tag('xLgr', settings.street)}${tag('nro', settings.number)}${tag('xBairro', settings.neighborhood)}${tag('cMun', `${stateCode}02553`)}${tag('xMun', settings.city)}${tag('UF', settings.state)}${tag('CEP', onlyDigits(settings.cep))}${tag('cPais', '1058')}${tag('xPais', 'BRASIL')}</enderEmit>
          ${tag('IE', onlyDigits(settings.stateRegistration))}${tag('CRT', '1')}
        </emit>
        ${items.join('')}
        <total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCPUFDest>0.00</vFCPUFDest><vICMSUFDest>0.00</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${money(subtotal)}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>${money(total)}</vNF></ICMSTot></total>
        <transp><modFrete>9</modFrete></transp>
        <pag><detPag><tPag>${paymentCode}</tPag><vPag>${money(total)}</vPag></detPag></pag>
        <infAdic>${tag('infCpl', 'Documento emitido pelo sistema Orbe')}</infAdic>
      </infNFe>
    </NFe>`
  };
}

function signXml(xml, keyPem, certBase64, accessKeyValue) {
  const signature = new SignedXml({
    privateKey: keyPem,
    publicCert: `-----BEGIN CERTIFICATE-----\n${certBase64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'
  });
  signature.addReference({
    xpath: "//*[local-name(.)='infNFe']",
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    uri: `#NFe${accessKeyValue}`
  });
  signature.computeSignature(xml, { location: { reference: "//*[local-name(.)='infNFe']", action: 'after' } });
  return signature.getSignedXml();
}

function soapEnvelope(signedXml, batchId) {
  return `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="${SOAP_NS}"><soap:Body><nfeDadosMsg xmlns="${NFE_NS}"><enviNFe versao="4.00"><idLote>${batchId}</idLote><indSinc>1</indSinc>${signedXml}</enviNFe></nfeDadosMsg></soap:Body></soap:Envelope>`;
}

function parseSefazResponse(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const get = name => doc.getElementsByTagName(name)?.[0]?.textContent || doc.getElementsByTagNameNS('*', name)?.[0]?.textContent || null;
  return { statusCode: get('cStat'), reason: get('xMotivo'), protocol: get('nProt'), accessKey: get('chNFe') };
}

export async function emitNfceDirect(document) {
  const settings = document.restaurant.fiscalSettings;
  if (!settings.sefazAuthorizationUrl) throw new Error('Informe a URL SOAP de autorizacao NFC-e da SEFAZ.');
  if (!settings.certificatePfxEncrypted || !settings.certificatePasswordEncrypted) throw new Error('Envie o certificado A1 PFX e senha.');
  const pfxBuffer = decryptBuffer(settings.certificatePfxEncrypted);
  const passphrase = decryptText(settings.certificatePasswordEncrypted);
  const parsedPfx = pfxToPem(pfxBuffer, passphrase);
  const built = buildNfceXml(document, settings);
  const signedXml = signXml(built.xml, parsedPfx.privateKeyPem, parsedPfx.certificateDerBase64, built.key);
  const batchId = String(Date.now()).slice(-15);
  const soap = soapEnvelope(signedXml, batchId);
  const body = await postSoap(settings.sefazAuthorizationUrl, soap, pfxBuffer, passphrase, settings.sefazSoapAction);
  const parsed = parseSefazResponse(body);
  return { ...parsed, requestXml: signedXml, responseXml: body, key: built.key };
}

export function serializeXml(xml) {
  return new XMLSerializer().serializeToString(new DOMParser().parseFromString(xml, 'text/xml'));
}

function postSoap(url, soap, pfxBuffer, passphrase, soapAction) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: 'POST',
      pfx: pfxBuffer,
      passphrase,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        SOAPAction: soapAction || '',
        'Content-Length': Buffer.byteLength(soap)
      }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) reject(new Error(`SEFAZ HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
        else resolve(text);
      });
    });
    req.on('error', reject);
    req.write(soap);
    req.end();
  });
}
