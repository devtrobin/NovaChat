import React from "react";
import {
  ActiveAgentTask,
  AgentContextFile,
  AgentPermissionDecision,
  AgentWorkspaceData,
} from "../../../shared/agent.types";
import {
  AgentPageStatus,
  AgentPageProps,
  AgentPageTab,
} from "./AgentPage.types";

export function useAgentPageController({
  agent,
  onSavedSettings,
}: AgentPageProps) {
  const [activeTasks, setActiveTasks] = React.useState<ActiveAgentTask[]>([]);
  const [activeTab, setActiveTab] = React.useState<AgentPageTab>("general");
  const [contextDraft, setContextDraft] = React.useState<AgentContextFile | null>(null);
  const [isEnabled, setIsEnabled] = React.useState(agent.enabled);
  const [isBusy, setIsBusy] = React.useState(true);
  const [status, setStatus] = React.useState<AgentPageStatus>(null);
  const [workspace, setWorkspace] = React.useState<AgentWorkspaceData | null>(null);

  const loadWorkspace = React.useCallback(async (
    options?: { preserveDraft?: boolean; silent?: boolean },
  ) => {
    if (!options?.silent) setIsBusy(true);
    if (!options?.preserveDraft) setStatus(null);

    try {
      const nextWorkspace = await window.nova.agents.loadWorkspace(agent.id);
      const settings = await window.nova.settings.load();
      setWorkspace(nextWorkspace);
      setIsEnabled(settings.agents[agent.id]?.enabled ?? true);
      if (!options?.preserveDraft) {
        setContextDraft(nextWorkspace.context);
      }
    } catch (error) {
      if (!options?.silent) {
        setStatus(toErrorStatus(error, "Le chargement de l'espace agent a echoue."));
      }
    } finally {
      if (!options?.silent) setIsBusy(false);
    }
  }, [agent.id]);

  const loadActiveTasks = React.useCallback(async (silent = false): Promise<boolean> => {
    try {
      const tasks = await window.nova.agents.getActiveTasks(agent.id);
      setActiveTasks(tasks);
      return true;
    } catch (error) {
      if (!silent) {
        setStatus(toErrorStatus(error, "Le chargement des taches actives a echoue."));
      }
      return false;
    }
  }, [agent.id]);

  React.useEffect(() => {
    let active = true;

    void loadWorkspace();
    const unsubscribe = window.nova.ai.onEvent(() => {
      window.setTimeout(() => {
        if (!active) return;
        void loadWorkspace({ preserveDraft: true, silent: true });
        void loadActiveTasks(true);
      }, 120);
    });
    const intervalId = window.setInterval(() => {
      if (active) void loadActiveTasks(true);
    }, 1000);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [loadActiveTasks, loadWorkspace]);

  React.useEffect(() => {
    void loadActiveTasks();
  }, [loadActiveTasks]);

  async function saveContext() {
    if (!contextDraft) return;
    await runBusyAction(
      async () => {
        const savedContext = await window.nova.agents.saveContext(agent.id, contextDraft);
        setContextDraft(savedContext);
        setWorkspace((current) => current ? { ...current, context: savedContext } : current);
        setStatus({ kind: "success", message: "Contexte enregistre." });
      },
      "L'enregistrement du contexte a echoue.",
    );
  }

  async function setEnabled(nextEnabled: boolean) {
    await runBusyAction(
      async () => {
        const settings = await window.nova.settings.load();
        const savedSettings = await window.nova.settings.save({
          ...settings,
          agents: {
            ...settings.agents,
            [agent.id]: { enabled: nextEnabled },
          },
        });
        onSavedSettings(savedSettings);
        setIsEnabled(savedSettings.agents[agent.id]?.enabled ?? nextEnabled);
        setStatus({
          kind: "success",
          message: `Agent ${nextEnabled ? "active" : "desactive"}.`,
        });
      },
      "La modification de l'agent a echoue.",
    );
  }

  async function setPermission(command: string, decision: AgentPermissionDecision) {
    await runBusyAction(
      async () => {
        const permissions = await window.nova.agents.savePermission(
          agent.id,
          command,
          decision,
          true,
        );
        setWorkspace((current) => current ? { ...current, permissions } : current);
        setStatus({
          kind: "success",
          message: `Permission ${decision === "allow" ? "autorisee" : "refusee"} pour la commande selectionnee.`,
        });
      },
      "La modification de la permission a echoue.",
    );
  }

  async function deletePermission(command: string) {
    await runBusyAction(
      async () => {
        const permissions = await window.nova.agents.deletePermission(agent.id, command);
        setWorkspace((current) => current ? { ...current, permissions } : current);
        setStatus({ kind: "success", message: "Permission supprimee." });
      },
      "La suppression de la permission a echoue.",
    );
  }

  async function stopTask(taskId: string) {
    await runBusyAction(
      async () => {
        await window.nova.agents.stopTask(taskId);
        if (await loadActiveTasks()) {
          setStatus({ kind: "success", message: "Tache agent interrompue." });
        }
      },
      "L'arret de la tache a echoue.",
    );
  }

  async function acknowledgeStorageRecovery() {
    const recoveryId = workspace?.storageRecovery?.id;
    if (!recoveryId) return;
    await runBusyAction(
      async () => {
        const acknowledged = await window.nova.chat.acknowledgeRecovery(recoveryId);
        if (acknowledged) await loadWorkspace();
      },
      "La validation de la recuperation a echoue.",
    );
  }

  async function runBusyAction(action: () => Promise<void>, fallback: string) {
    setIsBusy(true);
    setStatus(null);
    try {
      await action();
    } catch (error) {
      setStatus(toErrorStatus(error, fallback));
    } finally {
      setIsBusy(false);
    }
  }

  return {
    activeTab,
    activeTasks,
    acknowledgeStorageRecovery,
    contextDraft,
    deletePermission,
    isBusy,
    isEnabled,
    saveContext,
    setActiveTab,
    setContextDraft,
    setEnabled,
    setPermission,
    status,
    stopTask,
    workspace,
  };
}

function toErrorStatus(error: unknown, fallback: string): AgentPageStatus {
  return {
    kind: "error",
    message: error instanceof Error && error.message.trim()
      ? error.message
      : fallback,
  };
}
