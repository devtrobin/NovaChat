import React from "react";
import { useTranslation } from "react-i18next";

import type { Step } from './LoadingScreen.types';
import type { BootTask } from './LoadingStep/LoadingStep.types';

type LoadingTasksViewProps = {
  steps: Array<Step>;
  currentTasks: Array<BootTask>;
};

export function LoadingTasksView({ steps, currentTasks }: LoadingTasksViewProps) {
  const { t } = useTranslation();
  const statusText = React.useMemo(() => {
    if (currentTasks.length === 0) return t("loading.status.idle");
    if (currentTasks.length === 1) {
      return t("loading.status.single", { label: currentTasks[0].label });
    }
    return t("loading.status.multiple", { count: currentTasks.length });
  }, [currentTasks, t]);

  return (
    <div className="nova-loading">
      <h1 className="nova-title">{t("app.title")}</h1>
      <div className={`nova-steps ${currentTasks.length === 0 ? "is-dimmed" : ""}`}>
        {steps.map((step) => (
          <div key={step.id} className={`nova-step ${step.status === "pending" ? "is-pending" : ""}`}>
            <span className="nova-step-label">{step.label}</span>
            <span className="nova-step-icon">
              {step.status === "pending" && "⏸"}
              {step.status === "loading" && "⏳"}
              {step.status === "success" && "✅"}
              {step.status === "error" && "❌"}
            </span>
          </div>
        ))}
      </div>
      <div className="nova-status">{statusText}</div>
    </div>
  );
}
