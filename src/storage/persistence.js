const fs = require('node:fs/promises');
const { Blockchain } = require('../core/Blockchain');
/** @see tests/storage/persistence.test.js */
async function saveChain(filePath, blockchain) {
  await fs.writeFile(filePath, JSON.stringify(blockchain.toJSON(), null, 2), 'utf8');
}

async function loadChain(filePath, minerAddress) {
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return Blockchain.fromJSON(data, minerAddress);
}

module.exports = { saveChain, loadChain };
