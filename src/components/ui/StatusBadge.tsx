import type { AssetStatus } from "@/types/grid";

const STATUS_LABEL: Record<AssetStatus, string> = {
  operational: "Operational",
  damaged: "Damaged",
  critical: "Critical",
  repair: "Under Repair",
  restored: "Restored",
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABEL[status]}</span>;
}
