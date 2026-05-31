export interface HashChainEntry {
  currentHash: string;
  prevHash: string | null;
  position: number;
}

export interface SignOptions {
  xmlString: string;
  p12Base64: string;
  password?: string;
}
