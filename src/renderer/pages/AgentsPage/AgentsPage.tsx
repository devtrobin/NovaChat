import AELAgentPage from "./AELAgentPage/AELAgentPage";
import ACPAgentPage from "./ACPAgentPage/ACPAgentPage";
import AgentsPageEmpty from "./AgentsPageEmpty";
import { AgentsPageProps } from "./AgentsPage.types";

export default function AgentsPage({ activeAgent, onSavedSettings }: AgentsPageProps) {
  if (!activeAgent) {
    return <AgentsPageEmpty />;
  }

  if (activeAgent.id === "agent-ael") {
    return <AELAgentPage agent={activeAgent} onSavedSettings={onSavedSettings} />;
  }

  if (activeAgent.id === "agent-acp") {
    return <ACPAgentPage agent={activeAgent} onSavedSettings={onSavedSettings} />;
  }

  return <AgentsPageEmpty />;
}
