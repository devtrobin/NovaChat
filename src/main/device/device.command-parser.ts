export type ParsedCommandSegment = {
  tokens: string[];
  writeTargets: string[];
};

export type CommandParseResult =
  | {
      kind: "parsed";
      segments: ParsedCommandSegment[];
    }
  | {
      kind: "unsafe";
      reason: string;
    };

type SplitResult =
  | { kind: "segments"; values: string[] }
  | { kind: "unsafe"; reason: string };

const REDIRECTION_TOKENS = new Set(["<", ">", ">>"]);

export function parseCommand(command: string): CommandParseResult {
  const splitResult = splitCommand(command);
  if (splitResult.kind === "unsafe") return splitResult;

  const segments: ParsedCommandSegment[] = [];
  for (const value of splitResult.values) {
    const parsedSegment = parseSegment(value);
    if (parsedSegment.kind === "unsafe") return parsedSegment;
    segments.push(parsedSegment.segment);
  }

  if (segments.length === 0) {
    return {
      kind: "unsafe",
      reason: "La commande ne contient aucun segment executable.",
    };
  }

  return { kind: "parsed", segments };
}

function splitCommand(command: string): SplitResult {
  const segments: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let requiresNextSegment = false;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    const next = command[index + 1];

    if (quote) {
      if (
        quote === '"'
        && (isDynamicExpansionStart(char, next) || isWindowsExpansion(command, index))
      ) {
        return unsafe("Les expansions dynamiques ne sont pas analysees de facon sure.");
      }
      current += char;
      if (char === quote) quote = null;
      continue;
    }

    if (isQuoteCharacter(char)) {
      quote = char;
      current += char;
      continue;
    }

    if (isEscapeCharacter(char) && next) {
      current += `${char}${next}`;
      index += 1;
      continue;
    }

    if (isDynamicExpansionStart(char, next) || isWindowsExpansion(command, index) || char === "`") {
      return unsafe("Les substitutions ou expansions dynamiques exigent une confirmation.");
    }

    if (char === "(" || char === ")" || char === "{" || char === "}") {
      return unsafe("Les groupes et sous-shells ne sont pas analyses de facon sure.");
    }

    if ((char === "<" && next === "<") || ((char === ">" || char === "<") && next === "&")) {
      return unsafe("Cette redirection shell complexe n'est pas prise en charge.");
    }

    const operatorLength = getSegmentOperatorLength(char, next);
    if (operatorLength > 0) {
      const operator = command.slice(index, index + operatorLength);
      if (operator === "&" && process.platform !== "win32") {
        return unsafe("L'execution en arriere-plan exige une confirmation.");
      }
      if (!current.trim() && operator !== ";" && operator !== "\n") {
        return unsafe("Un operateur shell n'est pas entoure de commandes valides.");
      }
      if (current.trim()) segments.push(current.trim());
      current = "";
      requiresNextSegment = operator === "|" || operator === "&&" || operator === "||";
      index += operatorLength - 1;
      continue;
    }

    current += char;
    if (!/\s/.test(char)) requiresNextSegment = false;
  }

  if (quote) return unsafe("La commande contient une chaine non terminee.");
  if (requiresNextSegment && !current.trim()) {
    return unsafe("La commande se termine par un operateur shell incomplet.");
  }
  if (current.trim()) segments.push(current.trim());
  return { kind: "segments", values: segments };
}

function parseSegment(segment: string):
  | { kind: "parsed"; segment: ParsedCommandSegment }
  | { kind: "unsafe"; reason: string } {
  const rawTokens = tokenize(segment);
  const tokens: string[] = [];
  const writeTargets: string[] = [];

  for (let index = 0; index < rawTokens.length; index += 1) {
    const token = rawTokens[index];
    if (!REDIRECTION_TOKENS.has(token)) {
      tokens.push(token);
      continue;
    }

    const target = rawTokens[index + 1];
    if (!target || REDIRECTION_TOKENS.has(target)) {
      return unsafe("Une redirection shell ne possede pas de cible valide.");
    }
    if (token === ">" || token === ">>") writeTargets.push(target);
    index += 1;
  }

  return {
    kind: "parsed",
    segment: { tokens, writeTargets },
  };
}

function tokenize(segment: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  const pushCurrent = () => {
    if (!current) return;
    tokens.push(current);
    current = "";
  };

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index];
    const next = segment[index + 1];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (isEscapeCharacter(char) && next && quote === '"') {
        current += next;
        index += 1;
      } else {
        current += char;
      }
      continue;
    }

    if (isQuoteCharacter(char)) {
      quote = char;
      continue;
    }
    if (isEscapeCharacter(char) && next) {
      current += next;
      index += 1;
      continue;
    }
    if (/\s/.test(char)) {
      pushCurrent();
      continue;
    }
    if (char === ">" || char === "<") {
      const isFileDescriptor = /^\d+$/.test(current);
      if (!isFileDescriptor) pushCurrent();
      else current = "";
      if (char === ">" && next === ">") {
        tokens.push(">>");
        index += 1;
      } else {
        tokens.push(char);
      }
      continue;
    }
    current += char;
  }

  pushCurrent();
  return tokens;
}

function getSegmentOperatorLength(char: string, next?: string): number {
  if ((char === "&" && next === "&") || (char === "|" && next === "|")) return 2;
  if (char === "|" || char === "&" || char === ";" || char === "\n") return 1;
  return 0;
}

function isDynamicExpansionStart(char: string, next?: string): boolean {
  return char === "$" && Boolean(next && (next === "(" || next === "{" || /[A-Za-z_]/.test(next)));
}

function isEscapeCharacter(char: string): boolean {
  return process.platform === "win32" ? char === "^" : char === "\\";
}

function isQuoteCharacter(char: string): char is "'" | '"' {
  return char === '"' || (process.platform !== "win32" && char === "'");
}

function isWindowsExpansion(command: string, index: number): boolean {
  return process.platform === "win32"
    && command[index] === "%"
    && command.indexOf("%", index + 1) > index + 1;
}

function unsafe(reason: string): { kind: "unsafe"; reason: string } {
  return { kind: "unsafe", reason };
}
