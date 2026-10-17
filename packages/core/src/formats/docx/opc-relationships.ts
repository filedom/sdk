/** Minimal OPC relationship part parser (D02 slice; no DOM dependency). */

export interface OpcRelationship {
  id: string;
  type: string;
  target: string;
  targetMode?: "Internal" | "External";
}

const REL_TAG =
  /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"(?:[^>]*\bTargetMode="([^"]+)")?[^>]*\/?>/g;

export function parseRelationshipsXml(xml: string): OpcRelationship[] {
  const rels: OpcRelationship[] = [];
  for (const match of xml.matchAll(REL_TAG)) {
    const targetMode = match[4] as OpcRelationship["targetMode"] | undefined;
    rels.push({
      id: match[1]!,
      type: match[2]!,
      target: match[3]!,
      ...(targetMode ? { targetMode } : {}),
    });
  }
  return rels;
}

export function serializeRelationshipsXml(rels: readonly OpcRelationship[]): string {
  const body = rels
    .map((r) => {
      const mode = r.targetMode ? ` TargetMode="${r.targetMode}"` : "";
      return `  <Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"${mode}/>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${body}
</Relationships>`;
}

export function findRelationshipByType(
  rels: readonly OpcRelationship[],
  typeSuffix: string,
): OpcRelationship | undefined {
  return rels.find((r) => r.type.endsWith(typeSuffix));
}
