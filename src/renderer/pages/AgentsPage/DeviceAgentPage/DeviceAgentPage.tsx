import DeviceAgentContextTab from "./DeviceAgentContextTab";
import DeviceAgentGeneralTab from "./DeviceAgentGeneralTab";
import DeviceAgentHistoryTab from "./DeviceAgentHistoryTab";
import DeviceAgentPermissionsTab from "./DeviceAgentPermissionsTab";
import DeviceAgentTabs from "./DeviceAgentTabs";
import { DeviceAgentPageProps } from "./DeviceAgentPage.types";
import { useAgentPageController } from "../useAgentPageController";
import StorageRecoveryBanner from "../../../components/WorkspaceLayout/StorageRecoveryBanner";
import "../../ChatPage/ChatPage.css";
import "./DeviceAgentPage.css";

export default function DeviceAgentPage(props: DeviceAgentPageProps) {
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
          <DeviceAgentTabs
            activeTab={controller.activeTab}
            onSelect={controller.setActiveTab}
          />

          {controller.activeTab === "general" ? (
            <DeviceAgentGeneralTab
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

          {controller.activeTab === "permissions" ? (
            <DeviceAgentPermissionsTab
              isBusy={controller.isBusy}
              onDelete={controller.deletePermission}
              onSetPermission={controller.setPermission}
              rules={controller.workspace?.permissions.rules ?? []}
              status={controller.status}
            />
          ) : null}

          {controller.activeTab === "history" ? (
            <DeviceAgentHistoryTab history={controller.workspace?.history ?? []} />
          ) : null}
        </div>
      </section>
    </section>
  );
}
