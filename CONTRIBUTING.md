# Contributing

Thank you for your interest in improving pyLoad-ft.

## General principles

Please keep contributions focused, understandable, and easy to review.

Preferred areas of contribution include:

- security hardening
- safer filesystem and path handling
- WebUI and API boundary improvements
- Docker and container runtime improvements
- HTTPS / TLS-related improvements
- documentation cleanup and clarification

## Before submitting changes

Please try to keep pull requests:

- small enough to review comfortably
- clearly explained
- consistent with the repository scope
- free of secrets, local runtime state, or deployment-specific leftovers

## Security-related changes

For security-sensitive work, include:

- affected files or components
- threat or risk summary
- reproduction notes if relevant
- expected security outcome
- compatibility considerations

Please read `SECURITY.md` before publicly opening highly sensitive issues.

## Docker-related changes

For Docker or runtime changes, please document:

- what changed
- why it changed
- whether the image still builds cleanly
- whether runtime behavior was tested

## Documentation changes

Documentation improvements are welcome, especially when they improve clarity, public readability, or maintenance.

## Scope reminder

This public repository currently focuses on the full line first.

The lite line exists separately and is not the first public publication target here.
