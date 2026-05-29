# DevOps Architecture Notes

This submission uses the repository's test suite as the release gate. Local development and CI both install dependencies from the lockfile path and run `npm test`, so the same correctness signal is used before merging and before building an image. A lightweight lint script is included to syntax-check the JavaScript sources without adding another dependency to the assessment.

The Dockerfile has two targets. The default `runtime` target installs production dependencies only and starts the node with `npm start`, exposing the HTTP API on `3001` and the P2P WebSocket port on `6001`. The `test` target installs dev dependencies and runs the test suite, giving reviewers a containerized verification path that mirrors CI.

`docker-compose.yml` provides a single-node local environment with explicit `PORT`, `P2P_PORT`, and `DIFFICULTY` configuration. The app already supports optional peer settings through `PEER_HOST` and `PEER_PORT`, so additional compose services can be added later for multi-node P2P exercises without changing application code.

Operationally, the service writes logs to stdout/stderr for container runtime collection. The runbook in `candidate/RUNBOOK.md` documents local, Docker, Compose, CI, configuration, and troubleshooting workflows so another engineer can build, test, run, and reason about the node from a fresh clone.
