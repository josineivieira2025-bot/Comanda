function tlv(id, value) {
  const text = String(value || '');
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function crc16(payload) {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function sanitizeMerchant(value, fallback, max) {
  return String(value || fallback || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export function buildPixCode({ pixKey, merchantName, merchantCity, amount, txid, description }) {
  if (!pixKey) return null;
  const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey) + (description ? tlv('02', sanitizeMerchant(description, '', 50)) : '');
  const payload = [
    tlv('00', '01'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('54', Number(amount || 0).toFixed(2)),
    tlv('58', 'BR'),
    tlv('59', sanitizeMerchant(merchantName, 'LOJA', 25)),
    tlv('60', sanitizeMerchant(merchantCity, 'BRASIL', 15)),
    tlv('62', tlv('05', sanitizeMerchant(txid, '***', 25)))
  ].join('');
  const unsigned = `${payload}6304`;
  return `${unsigned}${crc16(unsigned)}`;
}
