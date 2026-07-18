import React from "react";
import { useTranslation } from "react-i18next";
import "./LoadingScreen.css";

import type { LoadingScreenProps } from './LoadingScreen.types';
import { getBootTasks } from './LoadingStep/LoadingStep.steps';
import { getCurrentTasks } from './LoadingScreen.fonctions';
import { useLoadingFlow } from './useLoadingFlow';
import { LoadingErrorView } from './LoadingErrorView';
import { LoadingTasksView } from './LoadingTasksView';

export default function LoadingScreen({ onReady }: LoadingScreenProps) {
  const { i18n } = useTranslation();
  const tasks = React.useMemo(() => getBootTasks(), [i18n.language]);
  const { phase, steps, currentTaskIds, retry } = useLoadingFlow({
    onReady,
    tasks,
  });

  if (phase === 'error') {
    return <LoadingErrorView steps={steps} onRetry={retry} />;
  }

  const currentTasks = getCurrentTasks(tasks, currentTaskIds);
  return <LoadingTasksView steps={steps} currentTasks={currentTasks} />;
}
