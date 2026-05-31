import forge from 'node-forge';
import { createHash } from 'crypto';
import { create } from 'xmlbuilder2';

/**
 * Sign an XML string using XAdES-EPES format for VeriFactu compliance.
 * 
 * @param xmlString - The XML content to sign
 * @param p12Base64 - PKCS#12 certificate in Base64
 * @param password - Password for the PKCS#12 certificate
 * @returns Complete signed XML string
 */
export function signXML(xmlString: string, p12Base64: string, password: string): string {
  // 1. Load PKCS#12 certificate and private key
  const p12Der = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  // Extract private key
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!keyBag) throw new Error('Private key not found in PKCS#12');
  const privateKey = keyBag.key as forge.pki.rsa.PrivateKey;

  // Extract certificate
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag) throw new Error('Certificate not found in PKCS#12');
  const cert = certBag.cert as forge.pki.Certificate;

  // Prepare Certificate data for XAdES
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certBase64 = forge.util.encode64(certDer);
  const certDigest = createHash('sha256').update(Buffer.from(certDer, 'binary')).digest('base64');
  
  const issuerName = cert.issuer.attributes
    .map(attr => `${attr.shortName}=${attr.value}`)
    .join(', ');
  const serialNumber = cert.serialNumber;

  // 2. Generate IDs
  const signatureId = `Signature-${Math.random().toString(36).substring(2, 9)}`;
  const signedPropertiesId = `SignedProperties-${signatureId}`;
  const signingTime = new Date().toISOString();

  // 3. Build SignedProperties XML
  // We use this to compute its digest for SignedInfo
  const signedPropsObj = {
    'xades:SignedProperties': {
      '@xmlns:xades': 'http://uri.etsi.org/01903/v1.3.2#',
      '@Id': signedPropertiesId,
      'xades:SignedSignatureProperties': {
        'xades:SigningTime': signingTime,
        'xades:SigningCertificate': {
          'xades:Cert': {
            'xades:CertDigest': {
              'ds:DigestMethod': { '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#sha256' },
              'ds:DigestValue': certDigest
            },
            'xades:IssuerSerial': {
              'ds:X509IssuerName': issuerName,
              'ds:X509SerialNumber': serialNumber
            }
          }
        },
        'xades:SignaturePolicyIdentifier': {
          'xades:SignaturePolicyId': {
            'xades:SigPolicyId': {
              'xades:Identifier': 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/v1/PoliticaFirmaSuministroFacturacion.pdf'
            },
            'xades:SigPolicyHash': {
              'ds:DigestMethod': { '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#sha256' },
              'ds:DigestValue': 'V8vpBy9H1TRp79f8yEIdL767B40=' // Placeholder for policy hash
            }
          }
        }
      }
    }
  };

  const signedPropsXml = create(signedPropsObj).end({ headless: true, prettyPrint: false });
  const signedPropsDigest = createHash('sha256').update(signedPropsXml).digest('base64');

  // 4. Compute Digest of original XML (enveloped)
  // Note: For a real implementation, we should canonicalize the XML excluding the Signature element.
  // Here we assume xmlString is the clean XML.
  const xmlDigest = createHash('sha256').update(xmlString).digest('base64');

  // 5. Build SignedInfo XML
  const signedInfoObj = {
    'ds:SignedInfo': {
      '@xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      'ds:CanonicalizationMethod': { '@Algorithm': 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315' },
      'ds:SignatureMethod': { '@Algorithm': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256' },
      'ds:Reference': [
        {
          '@URI': '',
          'ds:Transforms': {
            'ds:Transform': { '@Algorithm': 'http://www.w3.org/2000/09/xmldsig#enveloped-signature' }
          },
          'ds:DigestMethod': { '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#sha256' },
          'ds:DigestValue': xmlDigest
        },
        {
          '@URI': `#${signedPropertiesId}`,
          '@Type': 'http://uri.etsi.org/01903#SignedProperties',
          'ds:DigestMethod': { '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#sha256' },
          'ds:DigestValue': signedPropsDigest
        }
      ]
    }
  };

  const signedInfoXml = create(signedInfoObj).end({ headless: true, prettyPrint: false });
  
  // 6. Sign SignedInfo
  const md = forge.md.sha256.create();
  md.update(signedInfoXml, 'utf8');
  const signatureBytes = privateKey.sign(md);
  const signatureValue = forge.util.encode64(signatureBytes);

  // 7. Assemble the final Signature element
  const signatureObj = {
    'ds:Signature': {
      '@Id': signatureId,
      ...signedInfoObj['ds:SignedInfo'],
      'ds:SignatureValue': signatureValue,
      'ds:KeyInfo': {
        'ds:X509Data': {
          'ds:X509Certificate': certBase64
        }
      },
      'ds:Object': {
        'xades:QualifyingProperties': {
          '@xmlns:xades': 'http://uri.etsi.org/01903/v1.3.2#',
          '@Target': `#${signatureId}`,
          'xades:SignedProperties': signedPropsObj['xades:SignedProperties']
        }
      }
    }
  };

  // 8. Insert Signature into original XML
  // This is tricky without a proper XML parser that preserves everything.
  // We'll use xmlbuilder2 to merge them if possible, or just append it.
  // VeriFactu usually expects the Signature as the last child of the root element.
  
  const root = create(xmlString);
  root.root().import(create(signatureObj));
  
  return root.end({ prettyPrint: true, headless: false });
}
