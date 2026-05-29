# Blockchain Hometask Runbook

## Prerequisites

- Node.js 18 or newer
- npm
- Docker and Docker Compose for container workflows

## Local Development

Install dependencies and run the full test suite:

```bash
npm install
npm test
```

Start the API and P2P node:

```bash
npm start
```

Default endpoints:

- API: `http://localhost:3001`
- P2P: `ws://localhost:6001`

## Docker

Build the runtime image:

```bash
docker build -t blockchain-hometask .
```

Run the test suite in Docker:

```bash
docker build --target test -t blockchain-hometask:test .
docker run --rm blockchain-hometask:test
```

Run the node:

```bash
docker run --rm -p 3001:3001 -p 6001:6001 blockchain-hometask
```

The default runtime image installs production dependencies only. The `test` build target installs dev dependencies and configures the image to run `npm test`.

## Docker Compose

Start a local node:

```bash
docker compose up --build
```

Stop it:

```bash
docker compose down
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | HTTP API port |
| `P2P_PORT` | `6001` | WebSocket P2P port |
| `DIFFICULTY` | `2` | Initial proof-of-work difficulty |
| `PEER_HOST` | unset | Optional peer host |
| `PEER_PORT` | unset | Optional peer P2P port |

Example peer configuration:

```bash
PEER_HOST=other-node PEER_PORT=6001 npm start
```

## CI

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on pushes and pull requests. It:

- checks out the repository
- installs dependencies with `npm ci`
- runs `npm test`
- builds the Docker runtime image

## Operational Notes

- Logs are written to stdout/stderr and should be collected by the container runtime or hosting platform.
- The current compose file runs a single node. Multi-node local testing can be added by defining additional services with unique host ports and `PEER_HOST`/`PEER_PORT`.
- Persistence support depends on the application implementation in `src/storage/persistence.js`.
- The full test suite is expected to pass only after the blockchain implementation stubs in `src/` are completed.
