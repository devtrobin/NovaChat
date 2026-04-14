import React from "react";

type AppSidebarProviderItemProps = {
  active: boolean;
  meta: string;
  name: string;
  onClick: () => void;
};

export default function AppSidebarProviderItem({
  active,
  meta,
  name,
  onClick,
}: AppSidebarProviderItemProps) {
  return (
    <button className={`app-sidebar__subitem ${active ? "app-sidebar__subitem--active" : ""}`} onClick={onClick} type="button">
      <span className="app-sidebar__item-title">{name}</span>
      <span className="app-sidebar__item-meta">{meta}</span>
    </button>
  );
}
