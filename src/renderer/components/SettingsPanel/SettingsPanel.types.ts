import { AppSettings } from "../../../shared/settings.types";
import { SettingsCategory } from "../../services/workspace/workspace.types";

export type SettingsPanelProps = {
  activeCategory: SettingsCategory;
  onSaved: (settings: AppSettings) => void;
};
