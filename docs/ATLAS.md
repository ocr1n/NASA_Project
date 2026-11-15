# Reference atlas

The viewer uses all 2,234 packed BodyParts3D 4.0 structures from the [pinned Human Atlas revision](https://github.com/ashemag/human-atlas/tree/1c38bf35c254a891200d3cedecfd57abebe83d8d). Source geometry contains 2,288,268 triangles in approximately 33 MB of compressed chunks.

| Region key | Source concepts | Layer |
| --- | --- | --- |
| heart | FMA7088 | Organ |
| femur_left | FMA24475 | Skeletal |
| biceps_brachii_left | FMA37685, FMA37687 | Muscular |

[Manifest generator](../scripts/build-atlas-manifest.mjs) resolves actual concept elements and verifies geometry IDs and hashes. [Canonical manifest](../src/shared/atlas/manifest.json). Generic reported muscle sites remain unmapped; no mesh name is guessed.

Layers support visibility/opacity, orbit/pan/zoom, selection, focus, isolate/reset and a keyboard-accessible region list. Eligible shared findings reveal their layer and keep warning color during selection. Cleared/expired findings are not painted. Evidence prefers the current visible episode over older history.

The renderer batches packed geometry, uses per-structure GPU state, bounds DPR, pauses offscreen drawing and disposes owned resources. The observed local configuration reported 43 draw calls; transparent passes can submit source triangles more than once. Physical-device FPS is not guaranteed.

This is an educational adult-male reference with preserved proportions, not a reconstruction of either crew member. [Full data attribution](../public/atlas/ATTRIBUTION.md), [application MIT terms](../public/atlas/HUMAN-ATLAS-LICENSE.txt), [asset hashes](../public/atlas/provenance.json).
