import {
  allow,
  ask,
  askAlways,
  DeviceCommandPermissionPolicy,
} from "./device.policy.types";

const SIMPLE_READ_COMMANDS = new Set([
  "dir",
  "fc",
  "findstr",
  "more",
  "tree",
  "type",
  "ver",
  "where",
]);

const SAFE_REGISTRY_PREFIXES = [
  "hklm\\hardware",
  "hkey_local_machine\\hardware",
  "hklm\\system\\currentcontrolset\\control\\video",
  "hkey_local_machine\\system\\currentcontrolset\\control\\video",
];

const WINDOWS_VERSION_PATHS = new Set([
  "hklm\\software\\microsoft\\windows nt\\currentversion",
  "hkey_local_machine\\software\\microsoft\\windows nt\\currentversion",
]);

const SAFE_WINDOWS_VERSION_VALUES = new Set([
  "currentbuild",
  "currentbuildnumber",
  "displayversion",
  "editionid",
  "installationtype",
  "productname",
]);

export function evaluateWindowsCommand(
  commandName: string,
  tokens: string[],
): DeviceCommandPermissionPolicy | null {
  if (process.platform !== "win32") return null;
  if (SIMPLE_READ_COMMANDS.has(commandName)) {
    if (tokens.slice(1).some((token) => token.startsWith("\\\\"))) {
      return ask("network", "La lecture cible un chemin reseau Windows.");
    }
    return allow("read-local", "Commande Windows de lecture locale autorisee par defaut.");
  }

  if (commandName === "systeminfo") return evaluateSystemInfo(tokens);
  if (commandName === "driverquery") return evaluateDriverQuery(tokens);
  if (commandName === "fsutil") return evaluateFsutil(tokens);
  if (commandName === "ipconfig") return evaluateIpconfig(tokens);
  if (commandName === "pnputil") return evaluatePnputil(tokens);
  if (commandName === "reg") return evaluateReg(tokens);
  return null;
}

function evaluateSystemInfo(tokens: string[]): DeviceCommandPermissionPolicy {
  return onlyContainsOptions(tokens.slice(1), new Set(["/nh"]), new Map([
    ["/fo", new Set(["csv", "list", "table"])],
  ]))
    ? allow("read-local", "Inventaire local Windows autorise par defaut.")
    : askAlways("unclassified", "Seules les options locales de lecture systeminfo sont autorisees automatiquement.");
}

function evaluateDriverQuery(tokens: string[]): DeviceCommandPermissionPolicy {
  return onlyContainsOptions(tokens.slice(1), new Set(["/nh", "/si", "/v"]), new Map([
    ["/fo", new Set(["csv", "list", "table"])],
  ]))
    ? allow("read-local", "Inventaire local des pilotes autorise par defaut.")
    : askAlways("unclassified", "Seules les options locales de lecture driverquery sont autorisees automatiquement.");
}

function evaluateFsutil(tokens: string[]): DeviceCommandPermissionPolicy {
  return tokens[1]?.toLowerCase() === "fsinfo"
    ? allow("read-local", "Consultation fsutil fsinfo autorisee par defaut.")
    : askAlways("system", "Les autres sous-commandes fsutil peuvent modifier le systeme de fichiers.");
}

function evaluateIpconfig(tokens: string[]): DeviceCommandPermissionPolicy {
  const safeOptions = new Set(["/all", "/allcompartments", "/displaydns", "/showclassid"]);
  return tokens.slice(1).every((token) => safeOptions.has(token.toLowerCase()))
    ? allow("read-local", "Consultation de la configuration reseau locale autorisee par defaut.")
    : askAlways("system", "Cette option ipconfig peut modifier la configuration reseau.");
}

function evaluatePnputil(tokens: string[]): DeviceCommandPermissionPolicy {
  const operation = tokens[1]?.toLowerCase() ?? "";
  return operation.startsWith("/enum-")
    ? allow("read-local", "Enumeration locale pnputil autorisee par defaut.")
    : askAlways("system", "Cette operation pnputil peut modifier les pilotes ou peripheriques.");
}

function evaluateReg(tokens: string[]): DeviceCommandPermissionPolicy {
  if (tokens[1]?.toLowerCase() !== "query") {
    return askAlways("system", "Seule la sous-commande reg query est une lecture.");
  }

  const target = tokens[2]?.toLowerCase();
  if (!target) {
    return askAlways("unclassified", "La cible de reg query est absente.");
  }
  if (target.startsWith("\\\\")) {
    return askAlways("network", "La lecture d'un registre distant exige toujours une confirmation.");
  }

  const safeHardwareTarget = SAFE_REGISTRY_PREFIXES.some((prefix) => (
    target === prefix || target.startsWith(`${prefix}\\`)
  ));
  if (safeHardwareTarget) {
    return allow("read-local", "Lecture du registre materiel local autorisee par defaut.");
  }
  if (WINDOWS_VERSION_PATHS.has(target) && isSafeWindowsVersionQuery(tokens.slice(3))) {
    return allow("read-local", "Lecture d'une information publique de version Windows.");
  }
  return ask("read-local", "Cette lecture du registre peut exposer des donnees locales sensibles.");
}

function isSafeWindowsVersionQuery(tokens: string[]): boolean {
  let requestedValue: string | null = null;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].toLowerCase();
    if (token === "/v") {
      requestedValue = tokens[index + 1]?.toLowerCase() ?? null;
      index += 1;
      continue;
    }
    if (token === "/reg:32" || token === "/reg:64" || token === "/z") continue;
    return false;
  }
  return Boolean(requestedValue && SAFE_WINDOWS_VERSION_VALUES.has(requestedValue));
}

function onlyContainsOptions(
  tokens: string[],
  flags: Set<string>,
  optionsWithValues: Map<string, Set<string>>,
): boolean {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].toLowerCase();
    if (flags.has(token)) continue;

    const acceptedValues = optionsWithValues.get(token);
    const value = tokens[index + 1]?.toLowerCase();
    if (!acceptedValues || !value || !acceptedValues.has(value)) return false;
    index += 1;
  }
  return true;
}
