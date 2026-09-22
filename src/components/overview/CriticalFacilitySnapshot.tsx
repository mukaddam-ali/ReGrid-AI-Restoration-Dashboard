import type { CriticalFacilityOverview } from "@/types/overview";
import type { CriticalFacilityStatus } from "@/types/grid";

const STATUS_LABEL: Record<CriticalFacilityStatus, string> = {
  online: "Online",
  offline: "Offline",
  at_risk: "At Risk",
  dependency_blocked: "Dependency Blocked",
};

// Reuses the existing status badge palette rather than introducing new colors.
const STATUS_CLASS: Record<CriticalFacilityStatus, string> = {
  online: "status-operational",
  offline: "status-critical",
  at_risk: "status-damaged",
  dependency_blocked: "status-repair",
};

export function CriticalFacilitySnapshot({ facilities }: { facilities: CriticalFacilityOverview[] }) {
  return (
    <div className="card">
      <div className="panel-header">
        <div className="panel-title">Critical Infrastructure Snapshot</div>
      </div>
      <div className="panel-subtitle">Current simulated status of critical facilities.</div>
      <div className="facility-list">
        {facilities.map((facility) => (
          <div key={facility.id} className="facility-row">
            <div>
              <div className="facility-name">{facility.name}</div>
              <div className="facility-type">{facility.type}</div>
            </div>
            <span className={`status-badge ${STATUS_CLASS[facility.status]}`}>
              {STATUS_LABEL[facility.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
