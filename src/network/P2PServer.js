const WebSocket = require('ws');
const { Transaction } = require('../core/Transaction');
/** @see tests/network/p2p.test.js */
class P2PServer {
  constructor(blockchain, port) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.server = null;
  }

  listen() {
    if (!this.server) {
      this.server = new WebSocket.Server({ port: this.port });
      this.server.on('connection', (socket) => this.connectSocket(socket));
      const close = this.server.close.bind(this.server);
      this.server.close = (callback) => {
        for (const socket of this.sockets) {
          socket.terminate();
        }
        return close(callback);
      };
    }
    return this;
  }

  connectSocket(socket) {
    this.sockets.push(socket);
    socket.on('message', (data) => this.handleMessage(socket, data));
    socket.on('close', () => {
      this.sockets = this.sockets.filter((s) => s !== socket);
    });
    socket.on('error', () => {
      this.sockets = this.sockets.filter((s) => s !== socket);
    });
    this.sendChain(socket);
  }

  connectToPeer(host, port) {
    const socket = new WebSocket(`ws://${host}:${port}`);
    socket.on('open', () => this.connectSocket(socket));
    socket.on('error', () => {});
    return socket;
  }

  handleMessage(socket, data) {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (_error) {
      return;
    }

    if (message.type === 'CHAIN') {
      this.blockchain.replaceChain(message.chain);
      return;
    }

    if (message.type === 'TRANSACTION') {
      try {
        this.blockchain.addTransaction(Transaction.fromJSON(message.transaction));
      } catch (_error) {
        // Peers may already know the transaction or reject it in their local context.
      }
      return;
    }

    if (message.type === 'REQUEST_CHAIN') {
      this.sendChain(socket);
    }
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    for (const socket of this.sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  broadcastTransaction(transaction) {
    this.broadcast({ type: 'TRANSACTION', transaction: transaction.toJSON() });
  }

  broadcastChain() {
    this.broadcast({ type: 'CHAIN', chain: this.blockchain.chain.map((block) => block.toJSON()) });
  }

  sendChain(socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'CHAIN',
        chain: this.blockchain.chain.map((block) => block.toJSON()),
      }));
    }
  }
}

module.exports = { P2PServer };
