import path from "node:path";
import { AgentId } from "../../shared/agent.types";
import { enqueueSerialTask } from "../storage/serial-task.queue";

const queues = new Map<string, Promise<void>>();

export async function runAgentStorageOperation<T>(
  rootDirectory: string,
  agentId: AgentId,
  operation: () => Promise<T>,
): Promise<T> {
  const key = `${path.resolve(rootDirectory)}:${agentId}`;
  const previous = queues.get(key) ?? Promise.resolve();
  const { result, tail } = enqueueSerialTask(previous, operation);
  queues.set(key, tail);

  try {
    return await result;
  } finally {
    if (queues.get(key) === tail) {
      queues.delete(key);
    }
  }
}

export function clearAgentStorageQueues(): void {
  queues.clear();
}
