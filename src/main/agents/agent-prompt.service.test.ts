import { describe, expect, it } from "vitest";
import { AGENT_CONTEXT_SCHEMA_VERSION } from "../../shared/agent.types";
import { getDeviceRuntimeShell } from "../device/device.shell";
import {
  createAgentRuntimeContext,
  createDefaultAgentContext,
} from "./agent-prompt.service";
import { migrateAgentContext } from "./agent-context.migration";

describe("agent prompt context", () => {
  it("uses the exact shell family selected by Device execution", () => {
    const runtime = createAgentRuntimeContext("openai");
    const shell = getDeviceRuntimeShell();

    expect(runtime).toMatchObject({
      activeProvider: "openai",
      platform: process.platform,
      shell: shell.name,
      shellFamily: shell.family,
    });
  });

  it("migrates a known legacy Device default", () => {
    const migrated = migrateAgentContext("device-agent", {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Tu es l'agent Device de Nova. Tu aides l'assistant principal a inspecter la machine et a executer des commandes locales quand c'est necessaire. Tu dois privilegier une commande courte, lisible, specifique a la plateforme courante, sans heredoc massif ni script multiline complexe. Commence par l'option la plus simple et la moins intrusive. N'utilise sudo, nmap ou une commande active/invasive que si c'est vraiment necessaire et si la policy de permission l'autorise. Tu ne fais pas de gros scripts ni de plans complets: une commande ou une tres courte sequence a la fois, puis tu reviens avec une reponse courte, factuelle et exploitable par Nova.",
      name: "Device",
    });

    expect(migrated).toEqual(createDefaultAgentContext("device-agent"));
  });

  it("preserves user customization while advancing its schema version", () => {
    const migrated = migrateAgentContext("agent-planner", {
      description: "Mon planner",
      instructions: "Priorise les correctifs testables.",
      name: "Planner personnalise",
    });

    expect(migrated).toEqual({
      description: "Mon planner",
      instructions: "Priorise les correctifs testables.",
      name: "Planner personnalise",
      schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    });
  });

  it("updates the previous versioned Device default to the non-interactive profile", () => {
    const migrated = migrateAgentContext("device-agent", {
      description: "Execution des commandes et interactions device.",
      instructions:
        "Privilegie les inspections ciblees, les commandes courtes et les outils disponibles sur la plateforme. Evite les collectes trop larges quand une lecture precise suffit.",
      name: "Device",
      schemaVersion: 2,
    });

    expect(migrated).toEqual(createDefaultAgentContext("device-agent"));
    expect(migrated.instructions).toContain("non interactives");
  });
});
