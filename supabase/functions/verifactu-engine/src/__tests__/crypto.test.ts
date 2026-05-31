import forge from 'node-forge';
import { hashInvoice, buildChainEntry } from '../hash-chain';
import { generateQrDataURL } from '../qr-generator';
import { signXML } from '../xades-signer';

// Helper to create a dummy P12 for testing
function createTestP12(password: string): string {
  const keys = forge.pki.rsa.generateKeyPair(1024); // Small key for faster tests
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  const attrs = [{
    name: 'commonName',
    value: 'Test Cert'
  }, {
    name: 'organizationName',
    value: 'FactuTrust'
  }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return forge.util.encode64(p12Der);
}

describe('hash-chain module', () => {
  it('should generate a SHA-256 hash in uppercase hex', () => {
    const xml = '<test>data</test>';
    const hash = hashInvoice(xml);
    expect(hash).toMatch(/^[0-9A-F]{64}$/);
    expect(hash).toBe('F91BC81FD34B4A82B0F0E8540597064A389365932930D51AD712B4749EF54B4F');
  });

  it('should build a chain entry object', () => {
    const entry = buildChainEntry('HASH1', 'HASH0', 5);
    expect(entry).toEqual({
      currentHash: 'HASH1',
      prevHash: 'HASH0',
      position: 5
    });
  });
});

describe('qr-generator module', () => {
  it('should generate a data URL string containing expected fields', async () => {
    const nif = 'B12345678';
    const numFac = 'FAC-001';
    const date = '2025-05-31';
    const total = 123.45;
    const hash = 'DUMMYHASH';
    
    const qrDataUrl = await generateQrDataURL(nif, numFac, date, total, hash);
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('xades-signer module', () => {
  const password = 'password';
  const p12Base64 = createTestP12(password);
  const sampleXml = '<RegistroAlta><test>data</test></RegistroAlta>';

  it('should sign the XML and return a string with a Signature element', () => {
    const signedXml = signXML(sampleXml, p12Base64, password);
    
    expect(signedXml).toContain('<ds:Signature');
    expect(signedXml).toContain('<ds:SignatureValue');
    expect(signedXml).toContain('<xades:SignedProperties');
    expect(signedXml).toContain('<xades:SigningTime');
    expect(signedXml).toContain('https://www2.agenciatributaria.gob.es/');
  });

  it('should throw error on wrong password', () => {
    expect(() => signXML(sampleXml, p12Base64, 'wrong')).toThrow();
  });
});
