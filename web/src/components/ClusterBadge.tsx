import { useMemo } from "react";
import type { TasteProfile } from "../data/types";
import { getCluster } from "../data/api";

export function ClusterBadge({ profile }: { profile: TasteProfile }) {
  const cluster = useMemo(() => getCluster(profile), [profile]);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
        ✦
      </div>
      <div className="text-left">
        <div className="text-xs font-semibold uppercase tracking-wider text-orange-700">Taste Cluster</div>
        <div className="text-lg font-medium text-gray-900">{cluster.label}</div>
        <div className="text-sm text-gray-600">{cluster.tagline}</div>
      </div>
    </div>
  );
}
