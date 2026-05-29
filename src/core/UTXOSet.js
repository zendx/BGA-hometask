/** @see tests/unit/core/UTXOSet.test.js */
class UTXOSet {
  constructor() {
    this.utxos = new Map();
  }

  static key(txId, outputIndex) {
    return `${txId}:${outputIndex}`;
  }

  add(tx) {
    tx.outputs.forEach((output, outputIndex) => {
      this.utxos.set(UTXOSet.key(tx.id, outputIndex), {
        txId: tx.id,
        outputIndex,
        address: output.address,
        amount: output.amount,
      });
    });
  }

  spend(tx) {
    if (tx.isCoinbase && tx.isCoinbase()) return;
    tx.inputs.forEach((input) => {
      this.utxos.delete(UTXOSet.key(input.txId, input.outputIndex));
    });
  }

  applyTransaction(tx) {
    this.spend(tx);
    this.add(tx);
  }

  applyBlock(transactions) {
    transactions.forEach((tx) => this.applyTransaction(tx));
  }

  getBalance(address) {
    return this.getUnspentForAddress(address).reduce((sum, utxo) => sum + utxo.amount, 0);
  }

  getUnspentForAddress(address) {
    return Array.from(this.utxos.values()).filter((utxo) => utxo.address === address);
  }

  has(txId, outputIndex) {
    return this.utxos.has(UTXOSet.key(txId, outputIndex));
  }

  clone() {
    return UTXOSet.fromJSON(this.toJSON());
  }

  toJSON() {
    return Array.from(this.utxos.entries());
  }

  static fromJSON(entries) {
    const set = new UTXOSet();
    for (const [key, value] of entries || []) {
      set.utxos.set(key, { ...value });
    }
    return set;
  }
}

module.exports = { UTXOSet };
