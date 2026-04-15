import DeviceAgentPage from "./DeviceAgentPage/DeviceAgentPage";
import AgentsPageEmpty from "./AgentsPageEmpty";
import { AgentsPageProps } from "./AgentsPage.types";

export default function AgentsPage({ activeAgent }: AgentsPageProps) {
  if (!activeAgent) {
    return <AgentsPageEmpty />;
  }

  if (activeAgent.id === "device-agent") {
    return <DeviceAgentPage agent={activeAgent} />;
  }

  return <AgentsPageEmpty />;
}
