# Security policy

## Supported versions

Only the current `main` alpha line (0.1.x) is supported for fixes. There is no stable release or published npm package yet, and no security/support SLA.

## Reporting a vulnerability

Use GitHub **private vulnerability reporting**: open the repository's Security tab and choose **Report a vulnerability** (https://github.com/Ray0907/pdfwind/security/advisories/new). Do not disclose vulnerabilities, credentials, customer PDFs or exploit details in public issues/PRs.

The owner must enable private reporting before making the repository public. This preparation does not enable GitHub settings; if the reporting button is unavailable, contact the maintainer via the GitHub profile (https://github.com/Ray0907) to arrange a private channel before sharing details.

Include affected version/commit, a minimal sanitized reproduction, impact, environment and any suggested mitigation. Allow time for investigation and coordinated disclosure.

Treat document data, supplied HTML/CSS, fonts and image URLs as untrusted input. Server applications should validate inputs, restrict remote-image destinations (SSRF risk), apply resource/time limits, and protect private PDF outputs. The renderer is not an HTML sanitizer or a network sandbox.
