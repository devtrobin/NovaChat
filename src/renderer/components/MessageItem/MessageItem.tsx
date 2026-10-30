import React from "react";
import MessageItemChat from "./MessageItemChat";
import MessageItemAEL from "./MessageItemAEL";
import MessageItemSystem from "./MessageItemSystem";
import { isAELMessage, isSystemMessage } from "./MessageItem.service";
import { MessageItemProps } from "./MessageItem.types";
import "./MessageItem.css";

export default function MessageItem(props: MessageItemProps) {
  if (isSystemMessage(props.message)) {
    return (
      <MessageItemSystem
        message={props.message}
        onOpenSettings={props.onOpenSettings}
        onSubmitPermissionDecision={props.onSubmitPermissionDecision}
      />
    );
  }

  if (isAELMessage(props.message)) {
    return (
      <MessageItemAEL
        isSearchMatch={props.isSearchMatch}
        message={props.message}
        onKillCommand={props.onKillCommand}
        onSubmitCommandInput={props.onSubmitCommandInput}
        searchQuery={props.searchQuery}
      />
    );
  }

  return (
    <MessageItemChat
      isSearchMatch={props.isSearchMatch}
      message={props.message}
      searchQuery={props.searchQuery}
    />
  );
}
