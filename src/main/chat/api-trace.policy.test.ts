import { describe, expect, it } from "vitest";
import { ApiRequestRecord } from "../../shared/chat.types";
import { applyApiTracePolicy, redactValue } from "./api-trace.policy";

const now = Date.parse("2026-07-18T12:00:00.000Z");

describe("API trace policy", () => {
  it("can disable persistence entirely", () => {
    expect(applyApiTracePolicy([createRecord("2026-07-18T10:00:00.000Z")], {
      enabled: false,
      maxEntriesPerMessage: 50,
      redactSensitiveData: true,
      retentionDays: 30,
    }, now)).toEqual([]);
  });

  it("drops expired entries and enforces the per-message limit", () => {
    const records = [
      createRecord("2026-06-01T10:00:00.000Z"),
      createRecord("2026-07-18T09:00:00.000Z", 1),
      createRecord("2026-07-18T10:00:00.000Z", 2),
      createRecord("2026-07-18T11:00:00.000Z", 3),
    ];

    expect(applyApiTracePolicy(records, {
      enabled: true,
      maxEntriesPerMessage: 2,
      redactSensitiveData: false,
      retentionDays: 30,
    }, now).map((record) => record.payload)).toEqual([{ index: 2 }, { index: 3 }]);
  });

  it("redacts sensitive keys and token-looking strings recursively", () => {
    expect(redactValue({
      apiKey: "sk-secret-value",
      headers: {
        Authorization: "Bearer abc.def.ghi",
      },
      nested: ["sk-1234567890abcdef", "safe"],
    })).toEqual({
      apiKey: "[REDACTED]",
      headers: {
        Authorization: "[REDACTED]",
      },
      nested: ["[REDACTED]", "safe"],
    });
  });
});

function createRecord(at: string, index = 0): ApiRequestRecord {
  return {
    at,
    direction: "request",
    from: "nova",
    payload: { index },
    to: "openai",
  };
}
