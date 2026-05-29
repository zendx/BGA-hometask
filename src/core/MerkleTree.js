const { sha256 } = require('../crypto/hash');
/** @see tests/unit/core/MerkleTree.test.js */
class MerkleTree {
  constructor(leaves = []) {
    this.leaves = leaves;
    this.levels = [];

    if (leaves.length === 0) {
      this.root = null;
      return;
    }

    this.levels.push(leaves.map((leaf) => sha256(leaf)));
    while (this.levels[this.levels.length - 1].length > 1) {
      const current = this.levels[this.levels.length - 1];
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || left;
        next.push(sha256(left + right));
      }
      this.levels.push(next);
    }

    this.root = this.levels[this.levels.length - 1][0];
  }

  getProof(index) {
    if (index < 0 || index >= this.leaves.length) return null;

    const proof = [];
    let currentIndex = index;
    for (let levelIndex = 0; levelIndex < this.levels.length - 1; levelIndex++) {
      const level = this.levels[levelIndex];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      proof.push({
        position: isRight ? 'left' : 'right',
        hash: level[siblingIndex] || level[currentIndex],
      });
      currentIndex = Math.floor(currentIndex / 2);
    }
    return proof;
  }

  static verify(leaf, proof, root) {
    if (!proof) return false;

    let hash = sha256(leaf);
    for (const step of proof) {
      hash = step.position === 'left'
        ? sha256(step.hash + hash)
        : sha256(hash + step.hash);
    }
    return hash === root;
  }
}

module.exports = { MerkleTree };
