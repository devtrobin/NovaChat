import AELAgentContextTab from "./AELAgentContextTab";
import AELAgentGeneralTab from "./AELAgentGeneralTab";
import AELAgentHistoryTab from "./AELAgentHistoryTab";
import AELAgentPermissionsTab from "./AELAgentPermissionsTab";
import AELAgentTabs from "./AELAgentTabs";
import { AELAgentPageProps } from "./AELAgentPage.types";
import { useAgentPageController } from "../useAgentPageController";
import StorageRecoveryBanner from "../../../components/WorkspaceLayout/StorageRecoveryBanner";
import "../../ChatPage/ChatPage.css";
import "./AELAgentPage.css";

export default function AELAgentPage(props: AELAgentPageProps) {
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
        <div className="chat-page__panel agent-ael-page">
          {controller.workspace?.storageRecovery ? (
            <StorageRecoveryBanner
              notice={controller.workspace.storageRecovery}
              onAcknowledge={controller.acknowledgeStorageRecovery}
            />
          ) : null}
          <AELAgentTabs
            activeTab={controller.activeTab}
            onSelect={controller.setActiveTab}
          />

          {controller.activeTab === "general" ? (
            <AELAgentGeneralTab
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
            <AELAgentContextTab
              contextDraft={controller.contextDraft}
              isBusy={controller.isBusy}
              onChange={controller.setContextDraft}
              onSave={controller.saveContext}
              status={controller.status}
            />
          ) : null}

          {controller.activeTab === "permissions" ? (
            <AELAgentPermissionsTab
              isBusy={controller.isBusy}
              onDelete={controller.deletePermission}
              onSetPermission={controller.setPermission}
              rules={controller.workspace?.permissions.rules ?? []}
              status={controller.status}
            />
          ) : null}

          {controller.activeTab === "history" ? (
            <AELAgentHistoryTab history={controller.workspace?.history ?? []} />
          ) : null}
        </div>
      </section>
    </section>
  );
}
