import DeviceAgentContextTab from "../DeviceAgentPage/DeviceAgentContextTab";
import StorageRecoveryBanner from "../../../components/WorkspaceLayout/StorageRecoveryBanner";
import { AgentPageProps } from "../AgentPage.types";
import { useAgentPageController } from "../useAgentPageController";
import PlannerAgentGeneralTab from "./PlannerAgentGeneralTab";
import PlannerAgentTabs from "./PlannerAgentTabs";
import "../../ChatPage/ChatPage.css";
import "../DeviceAgentPage/DeviceAgentPage.css";

export default function PlannerAgentPage(props: AgentPageProps) {
  const { agent } = props;
  const controller = useAgentPageController(props);

  return (
    <section className="chat-page chat-page--static">
      <header className="chat-page__section-header">
        <div>
          <p className="chat-page__section-eyebrow">Agent Nova</p>
          <h1 className="chat-page__section-title">{agent.name}</h1>
        </div>
      </header>
      <section className="chat-page__content">
        <div className="chat-page__panel device-agent-page">
          {controller.workspace?.storageRecovery ? (
            <StorageRecoveryBanner
              notice={controller.workspace.storageRecovery}
              onAcknowledge={controller.acknowledgeStorageRecovery}
            />
          ) : null}
          <PlannerAgentTabs
            activeTab={controller.activeTab}
            onSelect={controller.setActiveTab}
          />

          {controller.activeTab === "general" ? (
            <PlannerAgentGeneralTab
              activeTasks={controller.activeTasks}
              agent={agent}
              isBusy={controller.isBusy}
              isEnabled={controller.isEnabled}
              onSetEnabled={controller.setEnabled}
              onStopTask={controller.stopTask}
              status={controller.status}
              workspace={controller.workspace}
            />
          ) : null}

          {controller.activeTab === "context" ? (
            <DeviceAgentContextTab
              contextDraft={controller.contextDraft}
              isBusy={controller.isBusy}
              onChange={controller.setContextDraft}
              onSave={controller.saveContext}
              status={controller.status}
            />
          ) : null}
        </div>
      </section>
    </section>
  );
}
