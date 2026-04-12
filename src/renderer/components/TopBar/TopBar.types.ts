export type TopBarProps = {
  isDeletable: boolean;
  isEditable: boolean;
  onDelete: () => void;
  onRename: (value: string) => void;
  title: string;
};
