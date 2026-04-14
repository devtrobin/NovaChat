import React from "react";
import MessageItemChat from "./MessageItemChat";
import MessageItemDevice from "./MessageItemDevice";
import MessageItemSystem from "./MessageItemSystem";
import { isDeviceMessage, isSystemMessage } from "./MessageItem.service";
import { MessageItemProps } from "./MessageItem.types";
import "./MessageItem.css";

export default function MessageItem(props: MessageItemProps) {
  if (isSystemMessage(props.message)) {
    return <MessageItemSystem message={props.message} onOpenSettings={props.onOpenSettings} />;
  }

  if (isDeviceMessage(props.message)) {
    return (
      <MessageItemDevice
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
