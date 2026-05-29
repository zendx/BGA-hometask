const crypto = require('node:crypto');
const { sha256 } = require('./hash');
/** @see tests/unit/crypto/keyPair.test.js */
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

function signData(privateKey, data) {
  const signer = crypto.createSign('SHA256');
  signer.update(String(data));
  signer.end();
  return signer.sign(privateKey, 'hex');
}

function verifySignature(publicKey, data, signature) {
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(String(data));
    verifier.end();
    return verifier.verify(publicKey, signature, 'hex');
  } catch (_error) {
    return false;
  }
}

function publicKeyFingerprint(publicKey) {
  return sha256(publicKey).slice(0, 16);
}

module.exports = { generateKeyPair, signData, verifySignature, publicKeyFingerprint };
