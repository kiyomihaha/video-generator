// Shared semantic color tokens for all scenes.
// Each scene imports from here instead of defining its own palette.
export const THEME = {
  canvas: {
    bg: "#08111f",
    panel: "#1e293b",
    grid: "#334155",
    altRowA: "#0a1428",
    altRowB: "#0c1830",
    deep: "#0f172a",
  },
  text: {
    primary: "#f8fafc",
    bright: "#e2e8f0",
    muted: "#64748b",
    dim: "#94a3b8",
    faint: "#475569",
    onColor: "#ffffff",
  },
  // CS architecture domain colors (cache tag/index/offset)
  architecture: {
    tag: "#38bdf8",
    index: "#c084fc",
    offset: "#f472b6",
  },
  // Cache hit/miss/eviction status colors
  status: {
    hit: "#10b981",
    miss: "#ef4444",
    eviction: "#f59e0b",
    dirty: "#f59e0b",
    pillHit: "#065f46",
    pillMiss: "#991b1b",
  },
  // Digital timing scene
  digital: {
    clock: "#60a5fa",
    data: "#facc15",
    output: "#4ade80",
    arrow: "#38bdf8",
    delay: "#f472b6",
    glitch: "#ef4444",
  },
  // Pipeline scene
  pipeline: {
    bubble: "#94a3b8",
    flush: "#ef4444",
    cell: "#3b82f6",
    cellBorder: "#3b82f6",
    marker: "#38b8db",
  },
  // Virtual memory scene
  vm: {
    tlb: "#8b5cf6",
    pageTable: "#6366f1",
    walk: "#38bdf8",
    fault: "#ef4444",
    address: "#f59e0b",
    decompose: "#c084fc",
    decomposeAlt: "#818cf8",
  },
  // Branch prediction — 2-bit saturating counter states
  counter: {
    stronglyNotTaken: "#ef4444",
    weaklyNotTaken: "#f97316",
    weaklyTaken: "#22c55e",
    stronglyTaken: "#10b981",
  },
  // LayeredArchitecture — stacked layer color palette
  layers: {
    layer1: "#38bdf8",
    layer2: "#10b981",
    layer3: "#f59e0b",
    layer4: "#8b5cf6",
    layer5: "#ef4444",
    layer6: "#ec4899",
    layer7: "#06b6d4",
    layer8: "#84cc16",
  },
} as const;
