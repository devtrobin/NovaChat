import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createFileWritePermissionMessage } from "../../../main/ai/ai.message-factory.system";
import MessageItemSystem from "./MessageItemSystem";

describe("file permission preview", () => {
  it("shows exact code as escaped text with only one-time actions", () => {
    const content = '\nif True:\n    print("<script>alert(1)</script>")\n';
    const message = createFileWritePermissionMessage({ path: "C:\\Desktop\\coucou.py", content, byteLength: 52, sha256: "digest" }, "request");
    const html = renderToStaticMarkup(<MessageItemSystem message={message} onOpenSettings={vi.fn()} onSubmitPermissionDecision={vi.fn()} />);
    expect(html).toContain("C:\\Desktop\\coucou.py");
    expect(html).toContain('\nif True:\n    print(&quot;&lt;script&gt;alert(1)&lt;/script&gt;&quot;)\n');
    expect(html).not.toContain("<script>");
    expect(html).toContain("Creer ce fichier");
    expect(html).not.toContain("permanent");
    expect(html.match(/<button/g)).toHaveLength(2);
  });
});
