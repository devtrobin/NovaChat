import React from "react";
import { AppSidebarProps } from "./AppSidebar.types";

type AppSidebarAgentsSectionProps = Pick<
  AppSidebarProps,
  "activeAgentId" | "activeSection" | "agents" | "onSelectAgent" | "onSelectSection"
>;

export default function AppSidebarAgentsSection({
  activeAgentId,
  activeSection,
  agents,
  onSelectAgent,
  onSelectSection,
}: AppSidebarAgentsSectionProps) {
  return (
    <section className={`app-sidebar__section${activeSection === "agents" ? " app-sidebar__section--active" : ""}`}>
      <button className="app-sidebar__section-trigger" onClick={() => onSelectSection("agents")} type="button">
        <span>Agents</span>
        <span className="app-sidebar__section-arrow">{activeSection === "agents" ? "−" : "+"}</span>
      </button>
      <div className="app-sidebar__section-body">
        <div className="app-sidebar__section-body-inner">
          <div className="app-sidebar__list">
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={`app-sidebar__item ${agent.id === activeAgentId ? "app-sidebar__item--active" : ""}`}
                onClick={() => onSelectAgent(agent.id)}
                type="button"
              >
                <span className="app-sidebar__item-title">{agent.name}</span>
                <span className="app-sidebar__item-meta">{agent.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
