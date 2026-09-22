import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { GridAsset, RepairCrew } from "@/types/grid";

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value}</div>
    </div>
  );
}

function DependencyColumn({
  title,
  assets,
  emptyLabel,
  onSelectAsset,
}: {
  title: string;
  assets: GridAsset[];
  emptyLabel: string;
  onSelectAsset: (assetId: string) => void;
}) {
  return (
    <div className="detail-deps-column">
      <div className="detail-deps-title">{title}</div>
      {assets.length > 0 ? (
        <div className="detail-chip-list">
          {assets.map((asset) => (
            <button key={asset.id} type="button" className="detail-chip" onClick={() => onSelectAsset(asset.id)}>
              <span className="mono detail-chip-id">{asset.id}</span>
              <span className="detail-chip-name">{asset.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="detail-empty">{emptyLabel}</div>
      )}
    </div>
  );
}

export function AssetDetailPanel({
  asset,
  upstream,
  downstream,
  assignedCrew,
  onSelectAsset,
}: {
  asset: GridAsset | null;
  upstream: GridAsset[];
  downstream: GridAsset[];
  assignedCrew: RepairCrew | null;
  onSelectAsset: (assetId: string) => void;
}) {
  if (!asset) {
    return (
      <div className="card infra-detail-panel">
        <div className="panel-title">Asset Detail</div>
        <p className="placeholder-card infra-detail-placeholder">
          Select an asset from the schematic to inspect its engineering detail.
        </p>
      </div>
    );
  }

  return (
    <div className="card infra-detail-panel">
      <div className="detail-header">
        <div className="mono detail-id">{asset.id}</div>
        <div className="detail-name">{asset.name}</div>
      </div>

      <div className="detail-badges">
        <StatusBadge status={asset.status} />
      </div>

      <div className="detail-grid">
        <DetailField label="Type" value={asset.type} />
        {asset.damageSeverity ? <DetailField label="Damage Severity" value={asset.damageSeverity} /> : null}
        {asset.estimatedRepairHours != null ? (
          <DetailField label="Est. Repair Time" value={`${asset.estimatedRepairHours}h`} />
        ) : null}
        {asset.populationServed != null ? (
          <DetailField label="Population Served" value={asset.populationServed.toLocaleString("en-US")} />
        ) : null}
        {asset.demandMw != null ? <DetailField label="Demand" value={`${asset.demandMw} MW`} /> : null}
        {asset.criticalFacility ? (
          <DetailField label="Critical Facility Served" value={asset.criticalFacility} />
        ) : null}
        {assignedCrew ? <DetailField label="Assigned Crew" value={assignedCrew.name} /> : null}
      </div>

      <div className="detail-deps">
        <DependencyColumn
          title="Upstream Dependencies"
          assets={upstream}
          emptyLabel="No upstream dependencies recorded."
          onSelectAsset={onSelectAsset}
        />
        <DependencyColumn
          title="Downstream Dependencies"
          assets={downstream}
          emptyLabel="No downstream dependencies recorded."
          onSelectAsset={onSelectAsset}
        />
      </div>
    </div>
  );
}
