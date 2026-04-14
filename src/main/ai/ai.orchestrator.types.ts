import { ChatTurnEvent } from "../../shared/ai.types";

export type Emit = (event: ChatTurnEvent) => void;
