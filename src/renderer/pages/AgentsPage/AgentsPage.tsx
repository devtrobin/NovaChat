import DiagnosticAgentPage from "./DiagnosticAgentPage/DiagnosticAgentPage";
import DeviceAgentPage from "./DeviceAgentPage/DeviceAgentPage";
import AgentsPageEmpty from "./AgentsPageEmpty";
import { AgentsPageProps } from "./AgentsPage.types";

export default function AgentsPage({ activeAgent, onSavedSettings }: AgentsPageProps) {
  if (!activeAgent) {
    return <AgentsPageEmpty />;
  }

  if (activeAgent.id === "device-agent") {
    return <DeviceAgentPage agent={activeAgent} onSavedSettings={onSavedSettings} />;
  }

  if (activeAgent.id === "diagnostic-agent") {
    return <DiagnosticAgentPage agent={activeAgent} onSavedSettings={onSavedSettings} />;
  }

  return <AgentsPageEmpty />;
}
