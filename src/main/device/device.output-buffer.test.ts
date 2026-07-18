import { describe, expect, it } from "vitest";
import { BoundedOutputBuffer } from "./device.output-buffer";

describe("BoundedOutputBuffer", () => {
  it("keeps complete output below the limit", () => {
    const output = new BoundedOutputBuffer(20);
    output.append("commande terminee");

    expect(output.toString()).toBe("commande terminee");
  });

  it("keeps the most recent output and reports truncation", () => {
    const output = new BoundedOutputBuffer(80);
    output.append("a".repeat(60));
    output.append("resultat-final".repeat(4));

    expect(output.toString()).toHaveLength(80);
    expect(output.toString()).toContain("Sortie tronquee");
    expect(output.toString()).toMatch(/resultat-final$/);
  });

  it("never exposes a huge incoming chunk in full", () => {
    const output = new BoundedOutputBuffer(100);
    output.append("x".repeat(10_000));

    expect(output.toString()).toHaveLength(100);
    expect(output.toString()).toContain("Sortie tronquee");
  });
});
