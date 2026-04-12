import React from "react";
import { useTranslation } from "react-i18next";
import "./LoadingScreen.css";

import type { LoadingScreenProps } from './LoadingScreen.types';
import { getBootTasks } from './LoadingStep/LoadingStep.steps';
import { getCurrentTasks } from './LoadingScreen.fonctions';
import { useLoadingFlow } from './useLoadingFlow';
import { LoadingErrorView } from './LoadingErrorView';
import { LoadingTasksView } from './LoadingTasksView';
import { LoadingWelcomeView } from './LoadingWelcomeView';

export default function LoadingScreen({ onReady }: LoadingScreenProps) {
  const { i18n } = useTranslation();
  const tasks = React.useMemo(() => getBootTasks(), [i18n.language]);
  const { phase, welcomeVisible, steps, currentTaskIds, retry } = useLoadingFlow({
    onReady,
    tasks,
  });

  if (phase === 'welcome') {
    return <LoadingWelcomeView visible={welcomeVisible} />;
  }

  if (phase === 'error') {
    return <LoadingErrorView steps={steps} onRetry={retry} />;
  }

  const currentTasks = getCurrentTasks(tasks, currentTaskIds);
  return <LoadingTasksView steps={steps} currentTasks={currentTasks} />;
}
