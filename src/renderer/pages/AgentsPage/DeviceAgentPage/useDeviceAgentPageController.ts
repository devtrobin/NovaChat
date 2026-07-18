import React from "react";
import {
  ActiveAgentTask,
  AgentContextFile,
  AgentPermissionDecision,
  AgentWorkspaceData,
} from "../../../../shared/agent.types";
import { DeviceAgentPageProps, DeviceAgentTab } from "./DeviceAgentPage.types";

export function useDeviceAgentPageController({
  agent,
  onSavedSettings,
}: DeviceAgentPageProps) {
  const [activeTasks, setActiveTasks] = React.useState<ActiveAgentTask[]>([]);
  const [activeTab, setActiveTab] = React.useState<DeviceAgentTab>("general");
  const [contextDraft, setContextDraft] = React.useState<AgentContextFile | null>(null);
  const [isEnabled, setIsEnabled] = React.useState(agent.enabled);
  const [isBusy, setIsBusy] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [workspace, setWorkspace] = React.useState<AgentWorkspaceData | null>(null);

  const loadWorkspace = React.useCallback(async (options?: { preserveDraft?: boolean; silent?: boolean }) => {
    if (!options?.silent) setIsBusy(true);
    if (!options?.preserveDraft) setStatus("");

    try {
      const nextWorkspace = await window.nova.agents.loadWorkspace(agent.id);
      const settings = await window.nova.settings.load();
      setWorkspace(nextWorkspace);
      setIsEnabled(settings.agents[agent.id]?.enabled ?? true);
      if (!options?.preserveDraft) {
        setContextDraft(nextWorkspace.context);
      }
    } finally {
      if (!options?.silent) setIsBusy(false);
    }
  }, [agent.id]);

  const loadActiveTasks = React.useCallback(async () => {
    const tasks = await window.nova.agents.getActiveTasks(agent.id);
    setActiveTasks(tasks);
  }, [agent.id]);

  React.useEffect(() => {
    let active = true;

    void loadWorkspace().catch(() => {
      if (active) setIsBusy(false);
    });

    const unsubscribe = window.nova.ai.onEvent(() => {
      window.setTimeout(() => {
        if (!active) return;
        void loadWorkspace({ preserveDraft: true, silent: true });
        void loadActiveTasks();
      }, 120);
    });
    const intervalId = window.setInterval(() => {
      if (!active) return;
      void loadActiveTasks();
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
    setIsBusy(true);
    setStatus("");
    try {
      const savedContext = await window.nova.agents.saveContext(agent.id, contextDraft);
      setContextDraft(savedContext);
      setWorkspace((current) => current ? { ...current, context: savedContext } : current);
      setStatus("Contexte enregistre.");
    } finally {
      setIsBusy(false);
    }
  }

  async function setEnabled(nextEnabled: boolean) {
    setIsBusy(true);
    setStatus("");
    try {
      const settings = await window.nova.settings.load();
      const savedSettings = await window.nova.settings.save({
        ...settings,
        agents: {
          ...settings.agents,
          [agent.id]: {
            enabled: nextEnabled,
          },
        },
      });
      onSavedSettings(savedSettings);
      setIsEnabled(savedSettings.agents[agent.id]?.enabled ?? nextEnabled);
      setStatus(`Agent ${nextEnabled ? "active" : "desactive"}.`);
    } finally {
      setIsBusy(false);
    }
  }

  async function setPermission(command: string, decision: AgentPermissionDecision) {
    setIsBusy(true);
    setStatus("");
    try {
      const permissions = await window.nova.agents.savePermission(agent.id, command, decision, true);
      setWorkspace((current) => current ? { ...current, permissions } : current);
      setStatus(`Permission ${decision === "allow" ? "autorisee" : "refusee"} pour la commande selectionnee.`);
    } finally {
      setIsBusy(false);
    }
  }

  async function deletePermission(command: string) {
    setIsBusy(true);
    setStatus("");
    try {
      const permissions = await window.nova.agents.deletePermission(agent.id, command);
      setWorkspace((current) => current ? { ...current, permissions } : current);
      setStatus("Permission supprimee.");
    } finally {
      setIsBusy(false);
    }
  }

  async function stopTask(taskId: string) {
    setIsBusy(true);
    setStatus("");
    try {
      await window.nova.agents.stopTask(taskId);
      setStatus("Tache agent interrompue.");
      await loadActiveTasks();
    } finally {
      setIsBusy(false);
    }
  }

  return {
    activeTab,
    activeTasks,
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
