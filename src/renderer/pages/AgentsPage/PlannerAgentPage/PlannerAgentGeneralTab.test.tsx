import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PlannerAgentGeneralTab from "./PlannerAgentGeneralTab";

describe("PlannerAgentGeneralTab", () => {
  it("renders active work and an actionable controller error", () => {
    const html = renderToStaticMarkup(
      <PlannerAgentGeneralTab
        activeTasks={[{
          agentId: "agent-planner",
          conversationId: "conversation-1",
          request: "Analyser le depot",
          startedAt: "2026-07-19T10:00:00.000Z",
          status: "running",
          taskId: "task-1",
          title: "Analyse",
        }]}
        agent={{
          capabilities: ["Planification"],
          context: "contexte.json",
          description: "Agent de planification",
          enabled: true,
          features: [],
          id: "agent-planner",
          mission: "Decouper les demandes",
          name: "Planner",
          processes: [],
          tools: ["OpenAI"],
        }}
        isBusy={false}
        isEnabled
        onSetEnabled={vi.fn()}
        onStopTask={vi.fn()}
        status={{ kind: "error", message: "Chargement impossible" }}
        workspace={null}
      />,
    );

    expect(html).toContain("Analyser le depot");
    expect(html).toContain("settings-panel__status--error");
    expect(html).toContain("Chargement impossible");
  });
});
