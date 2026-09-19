export type AELCommandRiskCategory =
  | "destructive"
  | "network"
  | "read-local"
  | "system"
  | "unclassified"
  | "workspace-write";

export type AELCommandPermissionPolicy = {
  category: AELCommandRiskCategory;
  kind: "allow" | "ask" | "ask-always";
  reason: string;
};

export const AEL_RISK_CATEGORY_LABELS: Record<AELCommandRiskCategory, string> = {
  destructive: "suppression ou action destructive",
  network: "accès réseau",
  "read-local": "lecture locale",
  system: "installation ou modification système",
  unclassified: "action non classifiable automatiquement",
  "workspace-write": "écriture locale limitée au workspace",
};

const KIND_PRIORITY: Record<AELCommandPermissionPolicy["kind"], number> = {
  allow: 0,
  ask: 1,
  "ask-always": 2,
};

const CATEGORY_PRIORITY: Record<AELCommandRiskCategory, number> = {
  destructive: 5,
  network: 2,
  "read-local": 0,
  system: 3,
  unclassified: 4,
  "workspace-write": 1,
};

export function mergePolicyDecisions(
  current: AELCommandPermissionPolicy | null,
  candidate: AELCommandPermissionPolicy,
): AELCommandPermissionPolicy {
  if (!current) return candidate;

  if (KIND_PRIORITY[candidate.kind] !== KIND_PRIORITY[current.kind]) {
    return KIND_PRIORITY[candidate.kind] > KIND_PRIORITY[current.kind]
      ? candidate
      : current;
  }

  return CATEGORY_PRIORITY[candidate.category] > CATEGORY_PRIORITY[current.category]
    ? candidate
    : current;
}

export function allow(
  category: AELCommandRiskCategory,
  reason: string,
): AELCommandPermissionPolicy {
  return { category, kind: "allow", reason };
}

export function ask(
  category: AELCommandRiskCategory,
  reason: string,
): AELCommandPermissionPolicy {
  return { category, kind: "ask", reason };
}

export function askAlways(
  category: AELCommandRiskCategory,
  reason: string,
): AELCommandPermissionPolicy {
  return { category, kind: "ask-always", reason };
}
