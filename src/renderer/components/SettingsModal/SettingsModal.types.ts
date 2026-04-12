import { AppSettings } from "../../../shared/settings.types";

export type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (settings: AppSettings) => void;
};
