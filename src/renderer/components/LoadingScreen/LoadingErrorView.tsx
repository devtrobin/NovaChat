import React from "react";
import { useTranslation } from "react-i18next";

import type { Step } from './LoadingScreen.types';
import { getFirstErrorStep } from './LoadingScreen.fonctions';

type LoadingErrorViewProps = {
  steps: Array<Step>;
  onRetry: () => void;
};

export function LoadingErrorView({ steps, onRetry }: LoadingErrorViewProps) {
  const { t } = useTranslation();
  const firstError = getFirstErrorStep(steps);
  return (
    <div className="nova-screen">
      <div className="nova-error">
        <h1 className="nova-title">{t("app.title")}</h1>
        <p className="nova-subtitle">{t("loading.error.title")}</p>
        <pre className="nova-error-details">
          {firstError?.label}
          {firstError?.error ? `\n${firstError.error}` : ""}
        </pre>
        <button type="button" className="nova-retry" onClick={onRetry}>
          {t("loading.error.retry")}
        </button>
      </div>
    </div>
  );
}
