import crypto from 'node:crypto';
import QRCode from 'qrcode';

// Default Merchant UPI Configuration
export const UPI_CONFIG = {
  VPA: process.env.UPI_VPA || '9741676651-3@ybl',
  PAYEE_NAME: process.env.UPI_PAYEE_NAME || 'ToyVerse India',
  WEBHOOK_SECRET: process.env.UPI_WEBHOOK_SECRET || 'toyverse_upi_secret_key_2026',
  EXPIRY_MINUTES: 30,
};

/**
 * Generate a random short Base32 reference without ambiguous characters (no 0/O/1/I).
 * Format: ORD-XXXXXX (e.g. ORD-7K3M9Q)
 */
export function generatePublicRef(length = 6) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `ORD-${result}`;
}

/**
 * Build standard UPI payment URI specification:
 * upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...
 */
export function buildUpiUri({ vpa = UPI_CONFIG.VPA, payeeName = UPI_CONFIG.PAYEE_NAME, amountPaise, ref }) {
  const amountRupees = (amountPaise / 100).toFixed(2);
  return 'upi://pay?' + [
    `pa=${encodeURIComponent(vpa)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amountRupees}`,
    `cu=INR`,
    `tn=${encodeURIComponent(ref)}`, // Short ref note (e.g. ORD-7K3M9Q)
    `tr=${encodeURIComponent(ref)}`, // Transaction reference ID
  ].join('&');
}

/**
 * Generate QR code as Buffer (PNG format)
 */
export async function qrPng(uri) {
  return QRCode.toBuffer(uri, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
    type: 'png'
  });
}

/**
 * Generate QR code as Base64 Data URL for instant browser rendering
 */
export async function qrDataUrl(uri) {
  return QRCode.toDataURL(uri, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Compute HMAC-SHA256 signature for webhook payload:
 * signature = HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
 */
export function computeHmacSignature(secret, text) {
  return crypto.createHmac('sha256', secret).update(text).digest('hex');
}

/**
 * Constant-time signature verification preventing timing side-channel attacks
 */
export function verifySignature(secret, rawBody, timestamp, signature) {
  if (!signature || !timestamp || !rawBody) return false;
  const message = `${timestamp}.${rawBody}`;
  const expected = computeHmacSignature(secret, message);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * SHA-256 hash of raw string for idempotency deduplication
 */
export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Multi-Bank SMS / App Notification Regex Parser
 * Parses incoming alerts from Indian banks (SBI, HDFC, ICICI, Axis, Kotak, Paytm, PhonePe, GPay, etc.)
 * Extracts: amountPaise, ref, bank_txn_id, vpa
 */
export function parseBankMessage(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      amountPaise: null,
      ref: null,
      bank_txn_id: null,
      vpa: null,
      bank: 'Unknown',
      parsedSuccessfully: false
    };
  }

  const text = rawText.trim();
  let amountPaise = null;
  let ref = null;
  let bankTxnId = null;
  let vpa = null;
  let bank = 'Unknown';

  // 1. Amount Extraction (handles "Rs. 1,299.50", "Rs 999", "INR 450.00", "credited with INR 1200")
  const amountMatch = text.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                      text.match(/credited\s+(?:by|with)?\s*(?:Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                      text.match(/received\s+(?:Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

  if (amountMatch && amountMatch[1]) {
    const cleanAmountStr = amountMatch[1].replace(/,/g, '');
    const amountFloat = parseFloat(cleanAmountStr);
    if (!isNaN(amountFloat)) {
      amountPaise = Math.round(amountFloat * 100);
    }
  }

  // 2. Order Reference Extraction (matches "ORD-[A-Z0-9]{6}")
  const refMatch = text.match(/\b(ORD-[2-9A-HJ-NP-Z]{6})\b/i) ||
                   text.match(/\b(ORD-[A-Z0-9]{6,8})\b/i);
  if (refMatch) {
    ref = refMatch[1].toUpperCase();
  }

  // 3. Bank Transaction ID / RRN / UTR (12-digit UPI RRN or alphanumeric txn ID)
  const rrnMatch = text.match(/\b(?:RRN|UTR|Ref No|Txn ID|UPI Ref|Ref)\s*[:/-]?\s*([0-9]{12})\b/i) ||
                   text.match(/\bUPI\/([0-9]{12})\b/i) ||
                   text.match(/\b(?:txn|transaction)\s+(?:id|no\.?)\s*[:]?\s*([A-Za-z0-9_-]+)/i);
  if (rrnMatch) {
    bankTxnId = rrnMatch[1];
  }

  // 4. Sender VPA Extraction (e.g. "aarav@okhdfcbank", "paytm-989201@paytm")
  const vpaMatch = text.match(/\b([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})\b/);
  if (vpaMatch) {
    vpa = vpaMatch[1].toLowerCase();
  }

  // 5. Detect Bank Provider
  if (/sbi|state bank/i.test(text)) bank = 'SBI';
  else if (/hdfc/i.test(text)) bank = 'HDFC Bank';
  else if (/icici/i.test(text)) bank = 'ICICI Bank';
  else if (/axis/i.test(text)) bank = 'Axis Bank';
  else if (/kotak/i.test(text)) bank = 'Kotak Mahindra';
  else if (/paytm/i.test(text)) bank = 'Paytm Payments Bank';
  else if (/phonepe/i.test(text)) bank = 'PhonePe';
  else if (/google pay|gpay/i.test(text)) bank = 'Google Pay';
  else if (/bhim/i.test(text)) bank = 'BHIM UPI';

  return {
    amountPaise,
    ref,
    bank_txn_id: bankTxnId,
    vpa,
    bank,
    parsedSuccessfully: Boolean(amountPaise && (ref || text.length > 10))
  };
}
