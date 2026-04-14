import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import { WorkspaceLayoutController } from "./WorkspaceLayout.types";

type UseWorkspaceLayoutHandlersArgs = {
  setActiveAgentId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveSection: React.Dispatch<React.SetStateAction<WorkspaceLayoutController["activeSection"]>>;
  setActiveSettingsCategory: React.Dispatch<React.SetStateAction<WorkspaceLayoutController["activeSettingsCategory"]>>;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useWorkspaceLayoutHandlers({
  setActiveAgentId,
  setActiveSection,
  setActiveSettingsCategory,
  setIsPreviewMode,
}: UseWorkspaceLayoutHandlersArgs) {
  const handleSavedSettings = React.useCallback((settings: AppSettings) => {
    setIsPreviewMode(settings.previewMode);
  }, [setIsPreviewMode]);

  const handleSelectAgent = React.useCallback((agentId: string) => {
    setActiveAgentId(agentId);
    setActiveSection("agents");
  }, [setActiveAgentId, setActiveSection]);

  const handleKillCommand = React.useCallback(async (commandId: string) => {
    await window.nova.ai.killCommand(commandId);
  }, []);

  const handleSubmitCommandInput = React.useCallback(async (commandId: string, value: string) => {
    await window.nova.ai.submitCommandInput({ commandId, value });
  }, []);

  return {
    handleKillCommand,
    handleSavedSettings,
    handleSelectAgent,
    handleSelectSection: setActiveSection,
    handleSelectSettingsCategory: setActiveSettingsCategory,
    handleSubmitCommandInput,
  };
}
