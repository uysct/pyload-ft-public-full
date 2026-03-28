# pyload-ft-public-full

pyLoad-ft is a hardened, container-focused derivative of pyLoad / pyLoad-ng.

> pyLoad-ft is an independent derivative project and not an official upstream repository.

## Focus

- security hardening
- safer path and filesystem handling
- stricter WebUI and API boundaries
- reproducible Docker builds
- HTTPS/TLS-oriented future work
- container runtime hardening

## Scope

This public repository currently publishes the **full** line first.

The separately developed **lite** line exists internally, but is not the first publication target here.

## Repository layout

- `Dockerfile` — main Docker build for the current public full line
- `docker-entrypoint.sh` — container entrypoint
- `build-assets/default-settings/` — default config assets
- `build-assets/unrar` — runtime unrar binary
- `upstream/pyload/` — upstream-derived source tree with future-line modifications
- `CHANGELOG.md` — publication-oriented summary
- `SECURITY.md` — security notes
- `NOTICE.md` — derivative notice
- `REPO_SCOPE.md` — publication boundaries

## Quick start

Build:

    docker build -t pyload-ft-public-full .

Run:

    docker run -d \
      --name pyload-ft \
      -p 8000:8000 \
      -v /path/to/config:/config \
      -v /path/to/downloads:/downloads \
      pyload-ft-public-full

## Contributing

Contributions are welcome in areas such as security hardening, safer filesystem behavior, WebUI/API boundary improvements, Docker/runtime cleanup, HTTPS/TLS work, and documentation.

Please read `CONTRIBUTING.md` and `SECURITY.md` before opening larger or security-sensitive changes.

## Notes

pyLoad-ft is based on pyLoad / pyLoad-ng upstream work and should be treated as a hardened derivative project, not as an official upstream replacement.
