# Validation record

Verified 2026-09-24 UTC. Application commit: `9f1edc7d02fbdc69dd7e2937e4f0e398f150080b`.

Public site: https://shinshinjin.github.io/HIDE_ON_BG/

Evidence: [GitHub Actions run 36064405794](https://github.com/shinshinjin/HIDE_ON_BG/actions/runs/36064405794). All three jobs passed: build, deploy, verify-live. Screenshots are attached to the workflow artifacts.

| Check | Result |
| --- | --- |
| 14 Node engine/room/storage/transport tests | PASS |
| All 7,776 ordered dice combinations × 12 categories | PASS |
| 8-player engine finish, AI finish, tie, zero, forfeit | PASS |
| Authenticated reconnect, duplicate session, replay and stale revision | PASS |
| Solo full game in mobile viewport (390 px) | PASS |
| Refresh and IndexedDB restore | PASS |
| 8 independent Chromium contexts with actual WebRTC | PASS |
| 8-player complete game, all 96 scoring turns | PASS |
| Readiness, chat escaping, guest refresh, Host restore | PASS |
| Identical final scores across all 8 sessions | PASS |
| Duplicate-tab lock | PASS |
| GitHub Pages deployment | PASS |
| Repeat full integration suite on public Pages + PeerJS Cloud | PASS |
| Manual Chrome visit and roll on the deployed site | PASS |
| Application page errors in browser integration | None |

The full-game test caught PeerJS JSON's ~16KB message ceiling. Transport now uses binary serialization with chunking; both local and deployed 96-turn tests passed with complete growing history.

## Verification limits

- The 8 automated contexts run on one GitHub runner, using the public signaling service for the deployed test. This is not a test across 8 separate physical networks.
- Physical Android Chrome / iPhone Safari, Windows Edge and restrictive corporate NAT/firewall environments were not available for hands-on testing. CSS is responsive and uses standard browser APIs; real-device checks remain recommended.
- Mobile width tested: 390 px. Smaller widths have explicit CSS rules but are not certified by this run.
- No independently configured TURN relay was provisioned/tested. PeerJS 1.5.5's default public STUN/TURN candidates are used.
- Runtime network error handling and transport reconnection are implemented; there is no claim of guaranteed connectivity on all networks or against public service outages.
- Host migration is not implemented. The documented recovery path is the original Host reopening its IndexedDB/JSON save.
- Public room discovery is intentionally deferred; V1 uses invite codes.

The only non-application errors observed in the separate manual cloud browser were its installed extension's metadata messages. No application JavaScript errors were reported by the CI browser suite.
