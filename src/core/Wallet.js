const { generateKeyPair, publicKeyFingerprint } = require('../crypto/keyPair');
const { Transaction } = require('./Transaction');
/** @see tests/unit/core/Wallet.test.js */
class Wallet {
  constructor(keyPair = null) {
    this.keyPair = keyPair || generateKeyPair();
    this.address = publicKeyFingerprint(this.keyPair.publicKey);
  }

  createTransaction(recipientAddress, amount, utxos) {
    const tx = Transaction.create(this.address, recipientAddress, amount, utxos, this.address);
    return tx.sign(this.keyPair.privateKey, this.keyPair.publicKey);
  }

  getPublicKey() {
    return this.keyPair.publicKey;
  }
}

module.exports = { Wallet };
