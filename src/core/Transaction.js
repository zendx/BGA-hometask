const { COINBASE_TX_ID } = require('../config');
const { hashObject } = require('../crypto/hash');
const { signData, verifySignature } = require('../crypto/keyPair');
/** @see tests/unit/core/Transaction*.test.js */
class Transaction {
  constructor(inputs = [], outputs = [], timestamp = Date.now()) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.timestamp = timestamp;
    this.signatures = {};
    this.id = this.calculateId();
  }

  static coinbase(recipientAddress, amount, timestamp = Date.now()) {
    return new Transaction(
      [{ txId: COINBASE_TX_ID, outputIndex: 0, signature: null }],
      [{ address: recipientAddress, amount }],
      timestamp
    );
  }

  static create(senderAddress, recipientAddress, amount, utxos, changeAddress) {
    let total = 0;
    const inputs = [];

    for (const utxo of utxos) {
      inputs.push({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        signature: null,
      });
      total += utxo.amount;
      if (total >= amount) break;
    }

    if (total < amount) {
      throw new Error('Insufficient balance');
    }

    const outputs = [{ address: recipientAddress, amount }];
    const change = total - amount;
    if (change > 0) {
      outputs.push({ address: changeAddress || senderAddress, amount: change });
    }

    return new Transaction(inputs, outputs);
  }

  calculateId() {
    return hashObject({
      inputs: this.inputs.map(({ txId, outputIndex }) => ({ txId, outputIndex })),
      outputs: this.outputs,
      timestamp: this.timestamp,
    });
  }

  getSigningPayload(inputIndex) {
    return JSON.stringify({
      id: this.id,
      inputIndex,
      inputs: this.inputs.map(({ txId, outputIndex }) => ({ txId, outputIndex })),
      outputs: this.outputs,
      timestamp: this.timestamp,
    });
  }

  sign(privateKey, publicKey) {
    if (this.isCoinbase()) {
      throw new Error('Cannot sign coinbase');
    }

    this.signatures._publicKey = publicKey;
    this.inputs.forEach((input, index) => {
      const signature = signData(privateKey, this.getSigningPayload(index));
      input.signature = signature;
      this.signatures[index] = signature;
    });
    return this;
  }

  verify() {
    if (this.isCoinbase()) return true;
    if (this.inputs.length === 0 || !this.signatures._publicKey) return false;

    return this.inputs.every((input, index) => {
      const signature = this.signatures[index] || input.signature;
      return Boolean(signature) &&
        verifySignature(this.signatures._publicKey, this.getSigningPayload(index), signature);
    });
  }

  isCoinbase() {
    return this.inputs.length === 1 && this.inputs[0].txId === COINBASE_TX_ID;
  }

  spendFromSnapshot(utxoSnapshot) {
    if (this.isCoinbase()) return true;

    let inputTotal = 0;
    for (const input of this.inputs) {
      const key = `${input.txId}:${input.outputIndex}`;
      const utxo = utxoSnapshot.utxos ? utxoSnapshot.utxos.get(key) : utxoSnapshot.get(key);
      if (!utxo) return false;
      inputTotal += utxo.amount;
    }

    const outputTotal = this.outputs.reduce((sum, output) => sum + output.amount, 0);
    return inputTotal >= outputTotal;
  }

  toJSON() {
    return {
      id: this.id,
      inputs: this.inputs,
      outputs: this.outputs,
      timestamp: this.timestamp,
      signatures: this.signatures,
    };
  }

  static fromJSON(data) {
    const tx = new Transaction(data.inputs || [], data.outputs || [], data.timestamp);
    tx.signatures = data.signatures || {};
    tx.id = data.id || tx.calculateId();
    return tx;
  }
}

module.exports = { Transaction };
