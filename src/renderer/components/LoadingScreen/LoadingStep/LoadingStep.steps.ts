import type { BootTask } from "./LoadingStep.types";

import i18n from "../../../i18n";
import { sleep } from "../LoadingScreen.fonctions";

export function getBootTasks(): Array<BootTask> {
  return [
    {
      id: "preDelay",
      label: i18n.t("boot.steps.preDelay"),
      run: () => sleep(100),
    },
    {
      id: "ipc",
      label: i18n.t("boot.steps.ipc"),
      run: async () => {
        await window.nova.ping();
      },
      errorMessage: i18n.t("boot.errors.ipc"),
      timeoutMs: 3000,
    },
    {
      id: "libs",
      label: i18n.t("boot.steps.libs"),
      run: () => sleep(500),
      errorMessage: i18n.t("boot.errors.libs"),
    },
    {
      id: "postDelay",
      label: i18n.t("boot.steps.postDelay"),
      run: () => sleep(1000),
    },
  ];
}
