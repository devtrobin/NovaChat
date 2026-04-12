// LoadingScreen.fonctions.tsx

import i18n from "../../i18n";
import type { Step } from "./LoadingScreen.types";
import type { BootTask } from "./LoadingStep/LoadingStep.types";

/**
 * Pause utilitaire (async sleep)
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Met à jour un step par id
 */
export function updateStepById(
    steps: Step[],
    id: string,
    patch: Partial<Step>
): Step[] {
    return steps.map((step) =>
        step.id === id ? { ...step, ...patch } : step
    );
}

/**
 * Retourne le premier step en erreur (s'il existe)
 */
export function getFirstErrorStep(steps: Step[]): Step | undefined {
    return steps.find((step) => step.status === "error");
}

export function buildPendingSteps(tasks: BootTask[]): Step[] {
    return tasks.map((task) => ({
        id: task.id,
        label: task.label,
        status: "pending",
    }));
}

export async function runWithTimeout<T>(
    run: () => Promise<T>,
    timeoutMs?: number
): Promise<T> {
    if (!timeoutMs) return run();

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            run(),
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(i18n.t("errors.timeout", { ms: timeoutMs })));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error.trim().length > 0) return error;
    return i18n.t("errors.unknown");
}

export function getCurrentTasks(tasks: BootTask[], ids: string[]): BootTask[] {
    return ids
        .map((id) => tasks.find((task) => task.id === id))
        .filter((task): task is BootTask => Boolean(task));
}
