import React from "react";
import { SubmitPermissionDecisionRequest } from "../../../shared/ai.types";
import { AgentSettingsMap, AppSettings } from "../../../shared/settings.types";
import {
  WorkspaceError,
  WorkspaceLayoutController,
} from "./WorkspaceLayout.types";

type UseWorkspaceLayoutHandlersArgs = {
  setAgentSettings: React.Dispatch<React.SetStateAction<AgentSettingsMap>>;
  setActiveAgentId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveSection: React.Dispatch<React.SetStateAction<WorkspaceLayoutController["activeSection"]>>;
  setActiveSettingsCategory: React.Dispatch<React.SetStateAction<WorkspaceLayoutController["activeSettingsCategory"]>>;
  setHideInternalConversations: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkspaceError: React.Dispatch<React.SetStateAction<WorkspaceError | null>>;
};

export function useWorkspaceLayoutHandlers({
  setAgentSettings,
  setActiveAgentId,
  setActiveSection,
  setActiveSettingsCategory,
  setHideInternalConversations,
  setIsPreviewMode,
  setWorkspaceError,
}: UseWorkspaceLayoutHandlersArgs) {
  const handleSavedSettings = React.useCallback((settings: AppSettings) => {
    setAgentSettings(settings.agents);
    setHideInternalConversations(settings.hideInternalConversations);
    setIsPreviewMode(settings.previewMode);
  }, [setAgentSettings, setHideInternalConversations, setIsPreviewMode]);

  const handleSelectAgent = React.useCallback((agentId: string) => {
    setActiveAgentId(agentId);
    setActiveSection("agents");
  }, [setActiveAgentId, setActiveSection]);

  const handleKillCommand = React.useCallback(async (commandId: string) => {
    await runInteraction(
      () => window.nova.ai.killCommand(commandId),
      "L'arret de la commande a echoue.",
    );
  }, [setWorkspaceError]);

  const handleSubmitCommandInput = React.useCallback(async (commandId: string, value: string) => {
    await runInteraction(
      () => window.nova.ai.submitCommandInput({ commandId, value }),
      "L'envoi de la saisie a la commande a echoue.",
    );
  }, [setWorkspaceError]);

  const handleSubmitPermissionDecision = React.useCallback(async (payload: SubmitPermissionDecisionRequest) => {
    await runInteraction(
      () => window.nova.ai.submitPermissionDecision(payload),
      "L'envoi de la decision de permission a echoue.",
    );
  }, [setWorkspaceError]);

  async function runInteraction(
    interaction: () => Promise<unknown>,
    fallback: string,
  ): Promise<void> {
    try {
      await interaction();
    } catch (error) {
      setWorkspaceError({
        context: "interaction",
        message: error instanceof Error && error.message.trim()
          ? error.message
          : fallback,
      });
    }
  }

  return {
    handleKillCommand,
    handleSavedSettings,
    handleSelectAgent,
    handleSelectSection: setActiveSection,
    handleSelectSettingsCategory: setActiveSettingsCategory,
    handleSubmitPermissionDecision,
    handleSubmitCommandInput,
  };
}
