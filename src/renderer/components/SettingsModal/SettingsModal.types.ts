import { AppSettings } from "../../../shared/settings.types";

export type SettingsModalProps = {
  onSaved: (settings: AppSettings) => void;
};
