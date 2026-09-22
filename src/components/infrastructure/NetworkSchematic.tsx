import type { InfrastructureNetwork } from "@/types/infrastructure";

const COL_WIDTH = 190;
const ROW_HEIGHT = 92;
const NODE_WIDTH = 152;
const NODE_HEIGHT = 54;
const PADDING = 28;

const LEGEND_ITEMS: { status: string; label: string }[] = [
  { status: "operational", label: "Operational" },
  { status: "damaged", label: "Damaged" },
  { status: "critical", label: "Critical" },
  { status: "repair", label: "Under Repair" },
  { status: "restored", label: "Restored" },
];

function computeLayout(network: InfrastructureNetwork) {
  const rowsByTier = new Map<number, number>();
  network.nodes.forEach((node) => {
    rowsByTier.set(node.tier, Math.max(rowsByTier.get(node.tier) ?? 0, node.row + 1));
  });
  const maxRows = Math.max(1, ...Array.from(rowsByTier.values()));

  const positions = new Map<string, { x: number; y: number }>();
  network.nodes.forEach((node) => {
    const tierRows = rowsByTier.get(node.tier) ?? 1;
    const verticalOffset = ((maxRows - tierRows) * ROW_HEIGHT) / 2;
    positions.set(node.assetId, {
      x: PADDING + node.tier * COL_WIDTH,
      y: PADDING + verticalOffset + node.row * ROW_HEIGHT,
    });
  });

  return {
    positions,
    width: PADDING * 2 + (network.tierCount - 1) * COL_WIDTH + NODE_WIDTH,
    height: PADDING * 2 + (maxRows - 1) * ROW_HEIGHT + NODE_HEIGHT,
  };
}

export function NetworkSchematic({
  network,
  selectedAssetId,
  onSelect,
}: {
  network: InfrastructureNetwork;
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
}) {
  const { positions, width, height } = computeLayout(network);
  const selectedNode = network.nodes.find((n) => n.assetId === selectedAssetId) ?? null;

  const isEmphasized = (assetId: string) =>
    selectedNode != null &&
    (assetId === selectedNode.assetId ||
      selectedNode.upstreamAssetIds.includes(assetId) ||
      selectedNode.downstreamAssetIds.includes(assetId));

  const nodeOpacity = (assetId: string) => (selectedNode ? (isEmphasized(assetId) ? 1 : 0.35) : 1);

  const edgeOpacity = (fromId: string, toId: string) => {
    if (!selectedNode) return 0.55;
    return fromId === selectedNode.assetId || toId === selectedNode.assetId ? 1 : 0.12;
  };

  return (
    <div className="card infra-schematic-card">
      <div className="panel-header">
        <div>
          <div className="panel-title">Simulated Network Schematic</div>
          <div className="panel-subtitle" style={{ marginBottom: 0 }}>
            Node position reflects electrical tier, not geography. Select any asset to trace its
            dependency path.
          </div>
        </div>
      </div>

      <div className="network-legend">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.status} className="legend-item">
            <span className={`legend-dot legend-dot-${item.status}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-dot legend-dot-facility" aria-hidden="true" />
          Serves critical facility
        </span>
      </div>

      <div className="network-svg-wrap">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Simulated network schematic">
          {network.edges.map((edge) => {
            const from = positions.get(edge.fromAssetId);
            const to = positions.get(edge.toAssetId);
            if (!from || !to) return null;
            return (
              <line
                key={edge.id}
                x1={from.x + NODE_WIDTH}
                y1={from.y + NODE_HEIGHT / 2}
                x2={to.x}
                y2={to.y + NODE_HEIGHT / 2}
                stroke="var(--border-strong)"
                strokeWidth={1.4}
                opacity={edgeOpacity(edge.fromAssetId, edge.toAssetId)}
              />
            );
          })}

          {network.nodes.map((node) => {
            const pos = positions.get(node.assetId);
            if (!pos) return null;
            const selected = node.assetId === selectedAssetId;
            return (
              <g
                key={node.assetId}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${node.assetId} — ${node.name}`}
                className="network-node-group"
                opacity={nodeOpacity(node.assetId)}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onSelect(node.assetId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(node.assetId);
                  }
                }}
              >
                {selected ? (
                  <rect
                    x={-4}
                    y={-4}
                    width={NODE_WIDTH + 8}
                    height={NODE_HEIGHT + 8}
                    rx={9}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                ) : null}
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={6}
                  className={`network-node network-node-${node.status}`}
                />
                {node.isCriticalFacility || node.criticalFacility ? (
                  <circle cx={NODE_WIDTH - 8} cy={8} r={4} className="network-node-critical-dot" />
                ) : null}
                <text x={10} y={21} className={`network-node-id mono network-node-fg-${node.status}`}>
                  {node.assetId}
                </text>
                <text x={10} y={38} className="network-node-name">
                  {node.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
