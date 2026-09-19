import { describe, expect, it } from "vitest";
import {
  getSystemAgentDefinition,
  SYSTEM_AGENT_DEFINITIONS,
  SYSTEM_AGENT_IDS,
} from "./system-agent.registry";

describe("system agent registry", () => {
  it("exposes only the canonical phase 6.1 identifiers", () => {
    expect(SYSTEM_AGENT_IDS).toEqual(["agent-acp", "agent-ael"]);
  });

  it.each(SYSTEM_AGENT_IDS)("keeps the %s key and definition aligned", (agentId) => {
    const definition = getSystemAgentDefinition(agentId);

    expect(definition).toBe(SYSTEM_AGENT_DEFINITIONS[agentId]);
    expect(definition.id).toBe(agentId);
    expect(definition.defaultContext.name).toBe(definition.acronym);
  });
});
