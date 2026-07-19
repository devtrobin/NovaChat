import { describe, expect, it } from "vitest";
import { enqueueSerialTask } from "./serial-task.queue";

describe("serial task queue", () => {
  it("keeps operations ordered and recovers after a rejected task", async () => {
    const calls: string[] = [];
    let tail = Promise.resolve();
    const failed = enqueueSerialTask(tail, async () => {
      calls.push("failed");
      throw new Error("write failed");
    });
    tail = failed.tail;
    const recovered = enqueueSerialTask(tail, async () => {
      calls.push("recovered");
      return "saved";
    });

    await expect(failed.result).rejects.toThrow("write failed");
    await expect(recovered.result).resolves.toBe("saved");
    expect(calls).toEqual(["failed", "recovered"]);
  });
});
