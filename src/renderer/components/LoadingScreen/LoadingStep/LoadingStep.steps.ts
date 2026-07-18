import type { BootTask } from "./LoadingStep.types";

import i18n from "../../../i18n";

export function getBootTasks(): Array<BootTask> {
  return [
    {
      id: "ipc",
      label: i18n.t("boot.steps.ipc"),
      run: async () => {
        await window.nova.ping();
      },
      errorMessage: i18n.t("boot.errors.ipc"),
      timeoutMs: 3000,
    },
  ];
}
