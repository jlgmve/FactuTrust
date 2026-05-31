import { createHash } from 'crypto';
import { HashChainEntry } from './types';

/**
 * Generate SHA-256 hash of an invoice XML string.
 * VeriFactu typically uses uppercase hex for hashes in QR codes and chaining.
 */
export function hashInvoice(xmlString: string): string {
  return createHash('sha256').update(xmlString).digest('hex').toUpperCase();
}

/**
 * Build a hash chain entry for the database/ledger.
 */
export function buildChainEntry(currentHash: string, prevHash: string | null, position: number): HashChainEntry {
  return {
    currentHash,
    prevHash,
    position,
  };
}
