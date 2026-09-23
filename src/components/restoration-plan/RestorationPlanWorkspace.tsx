"use client";

import { useState } from "react";
import type { RecommendationReviewStatus, RestorationPlanItem } from "@/types/restorationPlan";
import { RestorationQueue } from "./RestorationQueue";
import { RecommendationDetailPanel } from "./RecommendationDetailPanel";
import { DEFAULT_REVIEW_STATE, type ReviewState } from "./reviewState";

export function RestorationPlanWorkspace({ items }: { items: RestorationPlanItem[] }) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(items[0]?.assetId ?? null);
  const [reviewByAsset, setReviewByAsset] = useState<Record<string, ReviewState>>({});

  const selectedItem = items.find((item) => item.assetId === selectedAssetId) ?? null;

  const reviewFor = (assetId: string): ReviewState => reviewByAsset[assetId] ?? DEFAULT_REVIEW_STATE;

  const setStatus = (assetId: string, status: RecommendationReviewStatus) => {
    setReviewByAsset((prev) => ({
      ...prev,
      [assetId]: { status, overrideSequence: prev[assetId]?.overrideSequence ?? null },
    }));
  };

  /** Validates and applies a sequence override; returns an error message on rejection, or null on success. */
  const applyOverride = (assetId: string, sequence: number): string | null => {
    if (!Number.isInteger(sequence)) {
      return "Override sequence must be a whole number.";
    }
    if (sequence < 1) {
      return "Override sequence must be at least 1.";
    }
    if (sequence > items.length) {
      return `Override sequence cannot exceed the queue length (${items.length}).`;
    }

    const conflict = items.find((other) => {
      if (other.assetId === assetId) return false;
      const otherEffective = reviewFor(other.assetId).overrideSequence ?? other.recommendedSequence;
      return otherEffective === sequence;
    });
    if (conflict) {
      return `Sequence position ${sequence} is already used by ${conflict.assetId}.`;
    }

    setReviewByAsset((prev) => ({
      ...prev,
      [assetId]: { status: "sequence_overridden", overrideSequence: sequence },
    }));
    return null;
  };

  return (
    <div className="plan-columns">
      <RestorationQueue
        items={items}
        selectedAssetId={selectedAssetId}
        reviewStatusFor={(assetId) => reviewFor(assetId).status}
        onSelect={setSelectedAssetId}
      />
      <RecommendationDetailPanel
        item={selectedItem}
        review={selectedAssetId ? reviewFor(selectedAssetId) : DEFAULT_REVIEW_STATE}
        onAccept={() => selectedAssetId && setStatus(selectedAssetId, "accepted")}
        onFlag={() => selectedAssetId && setStatus(selectedAssetId, "flagged")}
        onOverride={(sequence) => (selectedAssetId ? applyOverride(selectedAssetId, sequence) : "No recommendation selected.")}
      />
    </div>
  );
}
