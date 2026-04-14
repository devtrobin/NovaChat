import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import SettingsPanel from "../../components/SettingsPanel/SettingsPanel";
import { SettingsCategory } from "../../services/workspace/workspace.types";

type SettingsPageProps = {
  activeCategory: SettingsCategory;
  onSaved: (settings: AppSettings) => void;
};

export default function SettingsPage({ activeCategory, onSaved }: SettingsPageProps) {
  return <SettingsPanel activeCategory={activeCategory} onSaved={onSaved} />;
}
