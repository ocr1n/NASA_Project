# Security reporting

This research prototype has no authentication or backend. Use fictional data only. Do not upload personal health records, credentials or raw private exports to issues, Git history or public logs.

For a suspected vulnerability, use GitHub private vulnerability reporting if enabled, or privately contact the repository owner [ocr1n](https://github.com/ocr1n). If neither channel is available, request a private contact method without disclosing the vulnerability. No dedicated security address or response-time commitment is established yet.

Local exports contain complete records and provenance in plain JSON. SHA-256 detects content inconsistency; it is not encryption, an authenticity signature or access control. Protect exports accordingly. The app's local storage can be lost or inspected by a user of the same browser profile. See [validation and recovery limits](docs/DATA_VALIDATION.md).
