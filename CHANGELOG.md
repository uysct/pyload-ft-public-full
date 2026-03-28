# Changelog

## pyload-ft-public-full

This changelog is a public, publication-oriented summary of the current full line.

It is intentionally condensed and focuses on the most relevant work areas that shaped this derivative branch.

### Main work areas

- filesystem and path hardening across multiple runtime paths
- archive extraction safety improvements
- upload, temp, and storage containment checks
- API and WebUI permission tightening
- reduced information exposure in sensitive routes
- hardened container runtime patterns
- native HTTPS/TLS-related future work
- host allowlist support via `PYLOAD_ALLOWED_HOSTS`
- selected UI and operational improvements
- cleaner and more reproducible Docker-based builds

### Security-related themes

The full line includes substantial hardening work in areas such as:

- traversal-resistant path joining and containment checks
- safer archive extraction behavior
- stricter access boundaries for WebUI and API features
- reduced exposure of sensitive or overly broad functionality
- improved handling for hardened container deployments

### Container-oriented themes

The public full line is also shaped by container-focused work, including:

- reproducible Docker builds
- clearer runtime defaults
- better suitability for hardened container operation
- groundwork for stricter HTTPS/TLS operation inside containerized deployments

### Notes

- this repository currently publishes the full line first
- the lite line exists separately and is not the first public target here
- this changelog is a condensed public summary, not a full internal development log
