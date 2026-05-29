const { MAX_MEMPOOL_SIZE } = require('../config');
/** @see tests/unit/core/Mempool.test.js */
class Mempool {
  constructor() {
    this.transactions = new Map();
  }

  add(transaction) {
    if (transaction.isCoinbase && transaction.isCoinbase()) {
      throw new Error('Coinbase transactions cannot be added to mempool');
    }
    if (this.transactions.has(transaction.id)) {
      throw new Error('Transaction already in mempool');
    }
    if (this.transactions.size >= MAX_MEMPOOL_SIZE) {
      throw new Error('Mempool is full');
    }
    if (!transaction.verify()) {
      throw new Error('Invalid transaction signature');
    }

    const spentInputs = new Set();
    for (const pending of this.transactions.values()) {
      for (const input of pending.inputs) {
        spentInputs.add(`${input.txId}:${input.outputIndex}`);
      }
    }
    for (const input of transaction.inputs) {
      if (spentInputs.has(`${input.txId}:${input.outputIndex}`)) {
        throw new Error('Input already spent in mempool');
      }
    }

    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  remove(transactionId) {
    this.transactions.delete(transactionId);
  }

  removeMany(ids) {
    ids.forEach((id) => this.remove(id));
  }

  getPending(limit = 100) {
    return Array.from(this.transactions.values()).slice(0, limit);
  }

  has(transactionId) {
    return this.transactions.has(transactionId);
  }

  clear() {
    this.transactions.clear();
  }

  size() {
    return this.transactions.size;
  }
}

module.exports = { Mempool };
