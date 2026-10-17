import type { OpcPackage } from "./opc-package.js";
import { getMemberUtf8, setMemberUtf8 } from "./opc-package.js";
import type { ListParagraphMeta } from "./docx-list-numbering-stub.js";
import { computeListMarkersFromNumberingXml } from "./docx-numbering-runtime.js";
import {
  applyListRenumberWithOoxmlDefinitions,
  buildWordCompatibleNumberingXml,
  type WordNumberingLevelDef,
} from "./docx-numbering-ooxml-roundtrip.js";
import { DOCX_NUMBERING_PART } from "./docx-numbering-opc-patch.js";
import type { DocxListRenumberMutation } from "./docx-session-list-mutation.js";

/** G2-DOCX-11: session list state → numbering.xml OPC write-back (subset — not full Word). */
export interface DocxNumberingSessionWriteBackOptions {
  /** When numbering.xml missing, seed these level defs per distinct numId. */
  seedLevels?: readonly WordNumberingLevelDef[];
}

function distinctNumIds(paragraphs: readonly ListParagraphMeta[]): number[] {
  return [...new Set(paragraphs.map((p) => p.numId).filter((id) => id > 0))].sort((a, b) => a - b);
}

function buildSessionRenumberMutation(
  paragraphs: readonly ListParagraphMeta[],
  numberingXml: string | undefined,
): DocxListRenumberMutation | null {
  const numIds = distinctNumIds(paragraphs);
  if (!numIds.length) return null;
  const numId = numIds[0]!;
  const markers = computeListMarkersFromNumberingXml(paragraphs, numberingXml);
  return {
    kind: "docx-list-renumber-stub",
    numId,
    markers: [...markers],
  };
}

/** Write numbering.xml from session list paragraphs + existing defs when present. */
export function writeNumberingOpcFromSessionListState(
  pkg: OpcPackage,
  paragraphs: readonly ListParagraphMeta[],
  options?: DocxNumberingSessionWriteBackOptions,
): OpcPackage {
  let numberingXml: string | undefined;
  try {
    numberingXml = getMemberUtf8(pkg, DOCX_NUMBERING_PART);
  } catch {
    numberingXml = undefined;
  }

  const mutation = buildSessionRenumberMutation(paragraphs, numberingXml);
  if (!mutation) {
    return pkg;
  }

  let next = applyListRenumberWithOoxmlDefinitions(pkg, mutation);
  const numIds = distinctNumIds(paragraphs);
  for (const numId of numIds.slice(1)) {
    const levels =
      options?.seedLevels ??
      ([
        { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
        { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
      ] satisfies WordNumberingLevelDef[]);
    if (!numberingXml?.includes(`numId="${numId}"`)) {
      const seed = buildWordCompatibleNumberingXml(numId, levels);
      try {
        const existing = getMemberUtf8(next, DOCX_NUMBERING_PART);
        setMemberUtf8(next, DOCX_NUMBERING_PART, `${existing.trim()}\n${seed}`);
      } catch {
        setMemberUtf8(next, DOCX_NUMBERING_PART, seed);
      }
    }
  }
  return next;
}
