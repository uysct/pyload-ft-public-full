# Contributing

Thank you for your interest in pyLoad-ft.

This repository currently publishes the **public full line** first.

## Before opening large changes

Please prefer opening an issue first for:

- larger refactors
- security-sensitive changes
- behavioral changes in WebUI or API
- Docker/runtime design changes

## General expectations

Contributions should aim to preserve the direction of this repository:

- security-conscious changes
- reproducible container behavior
- minimal unnecessary complexity
- clear and reviewable diffs
- no embedded secrets, local configs, or private lab artifacts

## Good contribution areas

Examples of useful contributions include:

- security hardening
- safer filesystem/path handling
- API/WebUI boundary improvements
- Docker build cleanup
- documentation improvements
- test coverage for hardened behavior

## Please avoid

- committing private runtime data
- committing local TLS materials
- mixing unrelated large changes in one patch
- weakening security controls for convenience without strong justification

## Security issues

For security-relevant findings, please follow the guidance in `SECURITY.md` and prefer private reporting first.
