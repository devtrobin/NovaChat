import DeviceAgentPage from "./DeviceAgentPage/DeviceAgentPage";
import PlannerAgentPage from "./PlannerAgentPage/PlannerAgentPage";
import AgentsPageEmpty from "./AgentsPageEmpty";
import { AgentsPageProps } from "./AgentsPage.types";

export default function AgentsPage({ activeAgent, onSavedSettings }: AgentsPageProps) {
  if (!activeAgent) {
    return <AgentsPageEmpty />;
  }

  if (activeAgent.id === "device-agent") {
    return <DeviceAgentPage agent={activeAgent} onSavedSettings={onSavedSettings} />;
  }

  if (activeAgent.id === "agent-planner") {
    return <PlannerAgentPage agent={activeAgent} onSavedSettings={onSavedSettings} />;
  }

  return <AgentsPageEmpty />;
}
