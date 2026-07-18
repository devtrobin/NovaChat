export type DeviceCommandRiskCategory =
  | "destructive"
  | "network"
  | "read-local"
  | "system"
  | "unclassified"
  | "workspace-write";

export type DeviceCommandPermissionPolicy = {
  category: DeviceCommandRiskCategory;
  kind: "allow" | "ask" | "ask-always";
  reason: string;
};

export const DEVICE_RISK_CATEGORY_LABELS: Record<DeviceCommandRiskCategory, string> = {
  destructive: "suppression ou action destructive",
  network: "accès réseau",
  "read-local": "lecture locale",
  system: "installation ou modification système",
  unclassified: "action non classifiable automatiquement",
  "workspace-write": "écriture locale limitée au workspace",
};

const KIND_PRIORITY: Record<DeviceCommandPermissionPolicy["kind"], number> = {
  allow: 0,
  ask: 1,
  "ask-always": 2,
};

const CATEGORY_PRIORITY: Record<DeviceCommandRiskCategory, number> = {
  destructive: 5,
  network: 2,
  "read-local": 0,
  system: 3,
  unclassified: 4,
  "workspace-write": 1,
};

export function mergePolicyDecisions(
  current: DeviceCommandPermissionPolicy | null,
  candidate: DeviceCommandPermissionPolicy,
): DeviceCommandPermissionPolicy {
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
  category: DeviceCommandRiskCategory,
  reason: string,
): DeviceCommandPermissionPolicy {
  return { category, kind: "allow", reason };
}

export function ask(
  category: DeviceCommandRiskCategory,
  reason: string,
): DeviceCommandPermissionPolicy {
  return { category, kind: "ask", reason };
}

export function askAlways(
  category: DeviceCommandRiskCategory,
  reason: string,
): DeviceCommandPermissionPolicy {
  return { category, kind: "ask-always", reason };
}
