import { describe, expect, it } from "vitest";
import {
  createPermissionRequestSystemMessage,
  createPermissionResolutionSystemMessage,
} from "./ai.message-factory.system";

describe("permission system messages", () => {
  it("distinguishes one-time and permanent refusal actions", () => {
    const message = createPermissionRequestSystemMessage("npm test", "request-1");

    expect(message.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "permission-deny", label: "Non" }),
      expect.objectContaining({ id: "permission-deny-always", label: "Toujours refuser" }),
    ]));
  });

  it("states whether a refusal is temporary or permanent", () => {
    expect(createPermissionResolutionSystemMessage("deny", "npm test").content)
      .toContain("refusee une fois");
    expect(createPermissionResolutionSystemMessage("deny-always", "npm test").content)
      .toContain("refusee de maniere permanente");
  });
});
