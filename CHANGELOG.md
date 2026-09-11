# Changelog

## 1.1.0 — 2026-09-10

- Decode signed 16-bit samples correctly across arbitrary output-buffer boundaries.
- Keep mono channel IDs at zero and clamp the minimum signed sample to -1, matching the documented range. Other sample normalization is unchanged.
- Wait for ffmpeg process closure before completion and report failed execution even when partial audio was produced. Missing executables, empty output and truncated samples now return a nonempty error string, exactly once.
- Add regression tests and real ffmpeg mono/stereo fixture tests.
- Include TypeScript declarations, repository/license metadata and an explicit package file list.

### Compatibility notes

The callback and legacy event-stream APIs remain available. Code that relied on success after a failed ffmpeg process must now handle the error callback. Negative full-scale samples now return -1 rather than a value slightly below -1. Completion occurs after process closure rather than stderr ending.

- Validate the installed tarball and strict CommonJS/ESM TypeScript consumers in CI. Stream declarations now include the inherited EventEmitter/Stream API.
