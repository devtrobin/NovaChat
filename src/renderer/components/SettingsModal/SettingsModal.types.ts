import { AppSettings } from "../../../shared/settings.types";
import { SettingsSidebarCategory } from "../ConversationSidebar/ConversationSidebar.types";

export type SettingsModalProps = {
  activeCategory: SettingsSidebarCategory;
  onSaved: (settings: AppSettings) => void;
};
