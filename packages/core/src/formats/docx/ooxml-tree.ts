/** Minimal namespace-aware tree for edited DOCX parts (W1 slice). */

export type OoxmlNodeKind = "element" | "text";

export interface OoxmlNode {
  id: string;
  kind: OoxmlNodeKind;
  name?: string;
  attributes?: Record<string, string>;
  text?: string;
  children?: OoxmlNode[];
}

let nextNodeId = 1;

export function resetOoxmlNodeIds(forTests = false): void {
  if (forTests) nextNodeId = 1;
}

export function parseDocumentBodyXml(xml: string): OoxmlNode {
  resetOoxmlNodeIds();
  const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/);
  const inner = bodyMatch?.[1] ?? "";
  const paragraphs = [...inner.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)];
  const children: OoxmlNode[] = paragraphs.map((match) => {
    const pInner = match[1] ?? "";
    const textMatch = pInner.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
    const text = textMatch?.[1] ?? "";
    return {
      id: `n${nextNodeId++}`,
      kind: "element",
      name: "w:p",
      children: text
        ? [{ id: `n${nextNodeId++}`, kind: "text", text }]
        : [],
    };
  });
  return {
    id: `n${nextNodeId++}`,
    kind: "element",
    name: "w:body",
    children,
  };
}

export function patchParagraphText(root: OoxmlNode, nodeId: string, newText: string): boolean {
  const target = findNode(root, nodeId);
  if (!target || target.name !== "w:p") return false;
  target.children = [
    {
      id: `n${nextNodeId++}`,
      kind: "text",
      text: newText,
    },
  ];
  return true;
}

export function serializeMinimalDocumentXml(body: OoxmlNode): string {
  const paragraphs =
    body.children?.map((p) => {
      const text = p.children?.find((c) => c.kind === "text")?.text ?? "";
      return `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
    }).join("") ?? "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}</w:body>
</w:document>`;
}

function findNode(node: OoxmlNode, id: string): OoxmlNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
