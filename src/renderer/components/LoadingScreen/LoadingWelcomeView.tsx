import React from "react";
import { useTranslation } from "react-i18next";

type LoadingWelcomeViewProps = {
  visible: boolean;
};

export function LoadingWelcomeView({ visible }: LoadingWelcomeViewProps) {
  const { t } = useTranslation();

  return (
    <div className="nova-screen">
      <div className={`nova-welcome ${visible ? "is-visible" : ""}`}>{t("loading.welcome")}</div>
    </div>
  );
}
