// LoadingScreen.types.ts

export type StepStatus = "pending" | "loading" | "success" | "error";

export type Step = {
    id: string;
    label: string;
    status: StepStatus;
    error?: string;
};

export type Phase = "tasks" | "welcome" | "error";

export type LoadingScreenProps = {
    onReady: () => void;
};
