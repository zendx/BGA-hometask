const {
  DIFFICULTY_ADJUSTMENT_INTERVAL,
  MINING_REWARD,
  TARGET_BLOCK_TIME_MS,
} = require('../config');
const { Block, createGenesisBlock } = require('./Block');
const { Mempool } = require('./Mempool');
const { Transaction } = require('./Transaction');
const { UTXOSet } = require('./UTXOSet');
/** @see tests/unit/core/Blockchain*.test.js and tests/integration/* */
class Blockchain {
  constructor(minerAddress, difficulty = 2) {
    this.difficulty = difficulty;
    this.mempool = new Mempool();
    this.utxoSet = new UTXOSet();
    this.chain = [this.createGenesisBlock(minerAddress)];
    this.utxoSet.applyBlock(this.chain[0].transactions);
  }

  createGenesisBlock(minerAddress) {
    return createGenesisBlock(Transaction.coinbase(minerAddress, MINING_REWARD, 0), this.difficulty);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getDifficultyForNextBlock() {
    if (
      this.chain.length <= DIFFICULTY_ADJUSTMENT_INTERVAL ||
      (this.chain.length - 1) % DIFFICULTY_ADJUSTMENT_INTERVAL !== 0
    ) {
      return this.getLatestBlock().difficulty;
    }

    const previousAdjustmentBlock =
      this.chain[this.chain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const elapsed = this.getLatestBlock().timestamp - previousAdjustmentBlock.timestamp;
    const expected = DIFFICULTY_ADJUSTMENT_INTERVAL * TARGET_BLOCK_TIME_MS;

    if (elapsed < expected / 2) return this.getLatestBlock().difficulty + 1;
    if (elapsed > expected * 2) return Math.max(1, this.getLatestBlock().difficulty - 1);
    return this.getLatestBlock().difficulty;
  }

  validateTransactionInContext(tx, utxoSnapshot = this.utxoSet) {
    if (tx.isCoinbase()) {
      return { valid: true };
    }

    let inputTotal = 0;
    const seenInputs = new Set();
    for (const input of tx.inputs) {
      const key = UTXOSet.key(input.txId, input.outputIndex);
      if (seenInputs.has(key)) {
        return { valid: false, reason: 'Duplicate input' };
      }
      seenInputs.add(key);

      const utxo = utxoSnapshot.utxos.get(key);
      if (!utxo) {
        return { valid: false, reason: 'Referenced UTXO not found' };
      }
      inputTotal += utxo.amount;
    }

    const outputTotal = tx.outputs.reduce((sum, output) => sum + output.amount, 0);
    if (outputTotal > inputTotal) {
      return { valid: false, reason: 'Outputs exceed inputs' };
    }

    if (!tx.verify()) {
      return { valid: false, reason: 'Invalid transaction signature' };
    }

    return { valid: true };
  }

  getUtxoSnapshotIncludingMempool(excludeTxId = null) {
    const snapshot = this.utxoSet.clone();
    for (const tx of this.mempool.getPending()) {
      if (tx.id !== excludeTxId) {
        snapshot.applyTransaction(tx);
      }
    }
    return snapshot;
  }

  addTransaction(transaction) {
    const snapshot = this.getUtxoSnapshotIncludingMempool(transaction.id);
    const result = this.validateTransactionInContext(transaction, snapshot);
    if (!result.valid) {
      throw new Error(result.reason);
    }
    return this.mempool.add(transaction);
  }

  minePendingTransactions(minerAddress) {
    const transactions = [Transaction.coinbase(minerAddress, MINING_REWARD)];
    const snapshot = this.utxoSet.clone();

    for (const tx of this.mempool.getPending()) {
      const result = this.validateTransactionInContext(tx, snapshot);
      if (result.valid) {
        transactions.push(tx);
        snapshot.applyTransaction(tx);
      }
    }

    const block = new Block(
      this.chain.length,
      Date.now(),
      transactions,
      this.getLatestBlock().hash,
      0,
      this.getDifficultyForNextBlock()
    );
    block.mine();

    this.chain.push(block);
    this.utxoSet.applyBlock(transactions);
    this.mempool.removeMany(transactions.slice(1).map((tx) => tx.id));
    return block;
  }

  isChainValid() {
    if (this.chain.length === 0) return false;

    const rebuilt = new UTXOSet();
    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      const previousBlock = i === 0 ? null : this.chain[i - 1];
      if (block.index !== i) return false;
      if (!block.isValid(previousBlock)) return false;

      for (const tx of block.transactions) {
        const result = this.validateTransactionInContext(tx, rebuilt);
        if (!result.valid) return false;
        rebuilt.applyTransaction(tx);
      }
    }

    return true;
  }

  getBalance(address) {
    return this.utxoSet.getBalance(address);
  }

  replaceChain(newChain) {
    if (!Array.isArray(newChain) || newChain.length <= this.chain.length) return false;

    const blocks = newChain.map((block) =>
      block instanceof Block ? Block.fromJSON(block.toJSON()) : Block.fromJSON(block)
    );
    const candidate = Object.create(Blockchain.prototype);
    candidate.difficulty = this.difficulty;
    candidate.mempool = new Mempool();
    candidate.utxoSet = new UTXOSet();
    candidate.chain = blocks;

    if (!candidate.isChainValid()) return false;

    candidate.utxoSet = new UTXOSet();
    for (const block of blocks) {
      candidate.utxoSet.applyBlock(block.transactions);
    }

    this.chain = blocks;
    this.utxoSet = candidate.utxoSet;
    this.mempool.clear();
    return true;
  }

  toJSON() {
    return {
      difficulty: this.difficulty,
      chain: this.chain.map((block) => block.toJSON()),
      utxos: this.utxoSet.toJSON(),
    };
  }

  static fromJSON(data, minerAddress) {
    const blockchain = Object.create(Blockchain.prototype);
    blockchain.difficulty = data.difficulty || 2;
    blockchain.mempool = new Mempool();
    blockchain.chain = (data.chain || []).map((block) => Block.fromJSON(block));
    blockchain.utxoSet = new UTXOSet();

    if (blockchain.chain.length === 0 && minerAddress) {
      blockchain.chain = [blockchain.createGenesisBlock(minerAddress)];
    }

    for (const block of blockchain.chain) {
      blockchain.utxoSet.applyBlock(block.transactions);
    }

    return blockchain;
  }
}

module.exports = { Blockchain };
