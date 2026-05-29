const { hashObject, meetsDifficulty } = require('../crypto/hash');
const { MerkleTree } = require('./MerkleTree');
const { Transaction } = require('./Transaction');
/** @see tests/unit/core/Block*.test.js */
class Block {
  constructor(
    index,
    timestamp,
    transactions,
    previousHash,
    nonce = 0,
    difficulty = 2,
    hash = null
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.merkleRoot = this.computeMerkleRoot();
    this.hash = hash || this.calculateHash();
  }

  computeMerkleRoot() {
    return new MerkleTree(this.transactions.map((tx) => tx.id)).root;
  }

  calculateHash() {
    const calculated = hashObject({
      index: this.index,
      timestamp: this.timestamp,
      previousHash: this.previousHash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      merkleRoot: this.merkleRoot,
    });
    this.hash = calculated;
    return calculated;
  }

  mine() {
    this.merkleRoot = this.computeMerkleRoot();
    this.hash = this.calculateHash();
    while (!meetsDifficulty(this.hash, this.difficulty)) {
      this.nonce += 1;
      this.hash = this.calculateHash();
    }
    return this;
  }

  isValid(previousBlock) {
    if (previousBlock && this.previousHash !== previousBlock.hash) return false;
    if (this.merkleRoot !== this.computeMerkleRoot()) return false;

    const originalHash = this.hash;
    if (this.calculateHash() !== originalHash) return false;
    return meetsDifficulty(this.hash, this.difficulty);
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map((tx) => tx.toJSON()),
      previousHash: this.previousHash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      merkleRoot: this.merkleRoot,
      hash: this.hash,
    };
  }

  static fromJSON(data) {
    const block = new Block(
      data.index,
      data.timestamp,
      (data.transactions || []).map((tx) => Transaction.fromJSON(tx)),
      data.previousHash,
      data.nonce,
      data.difficulty,
      data.hash
    );
    block.merkleRoot = data.merkleRoot;
    return block;
  }
}

function createGenesisBlock(coinbaseTx, difficulty = 2) {
  const genesis = new Block(0, 0, [coinbaseTx], '0', 0, difficulty);
  genesis.mine();
  return genesis;
}

module.exports = { Block, createGenesisBlock };
