import React from 'react';

import type { Step, Phase } from './LoadingScreen.types';
import type { BootTask } from './LoadingStep/LoadingStep.types';
import {
  buildPendingSteps,
  runWithTimeout,
  getErrorMessage,
  sleep,
  updateStepById,
} from './LoadingScreen.fonctions';

type UseLoadingFlowArgs = {
  onReady: () => void;
  tasks: Array<BootTask>;
};

export function useLoadingFlow({ onReady, tasks }: UseLoadingFlowArgs) {
  const [phase, setPhase] = React.useState<Phase>('tasks');
  const [welcomeVisible, setWelcomeVisible] = React.useState(false);
  const [currentTaskIds, setCurrentTaskIds] = React.useState<Array<string>>([]);
  const [runId, setRunId] = React.useState(0);
  const [steps, setSteps] = React.useState<Array<Step>>(() => buildPendingSteps(tasks));
  const onReadyRef = React.useRef(onReady);

  React.useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const retry = React.useCallback(() => {
    setRunId((value) => value + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const startTask = (taskId: string) => {
      setSteps((prev) => updateStepById(prev, taskId, { status: 'loading' }));
    };

    const failTask = (task: BootTask, error: unknown) => {
      const details = getErrorMessage(error);
      const message = task.errorMessage ? `${task.errorMessage}\n${details}` : details;
      setSteps((prev) => updateStepById(prev, task.id, { status: 'error', error: message }));
    };

    const completeTask = (taskId: string) => {
      setSteps((prev) => updateStepById(prev, taskId, { status: 'success' }));
    };

    const runTask = async (task: BootTask) => {
      if (cancelled) return;
      startTask(task.id);
      await runWithTimeout(task.run, task.timeoutMs);
      if (!cancelled) completeTask(task.id);
    };

    async function runFlow() {
      let activeTask: BootTask | undefined;
      setPhase('tasks');
      setWelcomeVisible(false);
      setCurrentTaskIds([]);
      setSteps(buildPendingSteps(tasks));
      try {
        for (const task of tasks) {
          if (cancelled) return;
          activeTask = task;
          setCurrentTaskIds([task.id]);
          await runTask(task);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        if (activeTask) failTask(activeTask, error);
        setCurrentTaskIds([]);
        setPhase('error');
        return;
      }
      if (cancelled) return;
      setPhase('welcome');
      setCurrentTaskIds([]);
      setWelcomeVisible(true);
      await sleep(2000);
      if (cancelled) return;
      setWelcomeVisible(false);
      await sleep(1000);
      if (!cancelled) onReadyRef.current();
    }

    runFlow();
    return () => {
      cancelled = true;
    };
  }, [runId, tasks]);

  return { phase, welcomeVisible, steps, currentTaskIds, retry };
}
