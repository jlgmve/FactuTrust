import QRCode from 'qrcode';

/**
 * Generate a VeriFactu-compliant QR code as a Base64 Data URL.
 * 
 * Format: NIF={nif}|NumFac={invNum}|FechaFac={date}|Total={total}|Huella={hash}
 * 
 * @param issuerNif - Issuer's tax ID
 * @param invoiceNumber - Full invoice number including series
 * @param issueDate - ISO date (YYYY-MM-DD)
 * @param total - Grand total (will be formatted to 2 decimals)
 * @param hash - SHA-256 hash of the invoice
 * @returns Promise<string> Base64 Data URL of the QR code image
 */
export async function generateQrDataURL(
  issuerNif: string,
  invoiceNumber: string,
  issueDate: string,
  total: number,
  hash: string
): Promise<string> {
  // VeriFactu QR string format
  const qrText = `NIF=${issuerNif}|NumFac=${invoiceNumber}|FechaFac=${issueDate}|Total=${total.toFixed(2)}|Huella=${hash}`;
  
  try {
    return await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    throw err;
  }
}
