# pyload-ng-future

A hardened, container-focused future branch of pyLoad with a strong focus on:

- security hardening
- safer path handling
- stricter WebUI/API access control
- cleaner container runtime behavior
- modernized HTTPS/TLS support
- slim and reproducible Docker builds

## Current publication scope

This public repository currently focuses on the **full** line first.

The separately developed **lite** line exists internally, but is not the first publication target here.

## Main goals

- preserve a reproducible Docker-based pyLoad workflow
- reduce attack surface where practical
- improve runtime hardening
- keep the project maintainable and understandable
- provide a cleaner base for future work

## Highlights of the future line

- extensive path traversal and filesystem safety hardening
- tighter API / WebUI permission boundaries
- hardened container runtime patterns
- native HTTPS/TLS work with pyOpenSSL support
- stricter host validation support via `PYLOAD_ALLOWED_HOSTS`
- improved operational behavior for hardened container deployments

## Repository structure

- `Dockerfile` -> current full image build
- `docker-entrypoint.sh` -> container entrypoint
- `build-assets/` -> default config assets and runtime extras
- `upstream/pyload/` -> upstream-derived source tree with future-line modifications

## Important note

This project is based on pyLoad / pyLoad-ng upstream work and should be treated as a hardened derivative line, not as an official upstream replacement.

## Status

This repository is being prepared for public release. Documentation and release structure are still being cleaned up and improved.
