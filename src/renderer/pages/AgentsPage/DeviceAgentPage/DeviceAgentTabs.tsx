import { DeviceAgentTab } from "./DeviceAgentPage.types";

type DeviceAgentTabsProps = {
  activeTab: DeviceAgentTab;
  onSelect: (tab: DeviceAgentTab) => void;
};

const TABS: Array<{ label: string; value: DeviceAgentTab }> = [
  { label: "General", value: "general" },
  { label: "Contexte", value: "context" },
  { label: "Permissions", value: "permissions" },
  { label: "Historique", value: "history" },
];

export default function DeviceAgentTabs({ activeTab, onSelect }: DeviceAgentTabsProps) {
  return (
    <nav className="device-agent-page__tabs">
      {TABS.map((tab) => (
        <button
          className={`device-agent-page__tab${activeTab === tab.value ? " device-agent-page__tab--active" : ""}`}
          key={tab.value}
          onClick={() => onSelect(tab.value)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
