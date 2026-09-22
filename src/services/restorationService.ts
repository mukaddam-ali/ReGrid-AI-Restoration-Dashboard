import {
  mockAssets,
  mockBaselineScenario,
  mockCrews,
  mockCriticalFacilities,
  mockDependencies,
  mockRecommendations,
} from "@/data/mockGridData";
import type {
  CriticalFacility,
  Dependency,
  GridAsset,
  RepairCrew,
  RestorationRecommendation,
  RestorationScenario,
  ScenarioResult,
} from "@/types/grid";

// Frontend service boundary: UI reads through these functions rather than
// touching mock data directly. Each call returns a Promise so a future API
// client can replace the mock implementations below without changing callers.

export function getAssets(): Promise<GridAsset[]> {
  return Promise.resolve(mockAssets);
}

export function getCriticalFacilities(): Promise<CriticalFacility[]> {
  return Promise.resolve(mockCriticalFacilities);
}

export function getDependencies(): Promise<Dependency[]> {
  return Promise.resolve(mockDependencies);
}

export function getCrews(): Promise<RepairCrew[]> {
  return Promise.resolve(mockCrews);
}

export function getRecommendations(): Promise<RestorationRecommendation[]> {
  return Promise.resolve(mockRecommendations);
}

export function getScenario(): Promise<RestorationScenario> {
  return Promise.resolve(mockBaselineScenario);
}

export function getScenarioResult(scenario: RestorationScenario): Promise<ScenarioResult> {
  return Promise.resolve({ scenarioId: scenario.id, recommendations: mockRecommendations });
}
