import {
  parseNumberingAbstractNumIds,
  parseNumberingNumIds,
} from "./docx-numbering-ooxml-roundtrip.js";

/** G2-DOCX-20: merge foreign numbering.xml into base with collision-safe ID allocation. */
export interface ForeignNumberingMergeResult {
  numberingXml: string;
  abstractNumIdRemap: Readonly<Record<number, number>>;
  numIdRemap: Readonly<Record<number, number>>;
}

function extractAbstractBlocks(xml: string): Map<number, string> {
  const blocks = new Map<number, string>();
  const re = /<w:abstractNum[^>]*\sw:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.set(Number(match[1]), match[0] ?? "");
  }
  return blocks;
}

function extractNumBlocks(xml: string): Map<number, string> {
  const blocks = new Map<number, string>();
  const re = /<w:num[^>]*\sw:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.set(Number(match[1]), match[0] ?? "");
  }
  return blocks;
}

function nextId(existing: readonly number[]): number {
  const max = existing.length ? Math.max(...existing) : 0;
  return max + 1;
}

function replaceAbstractId(block: string, from: number, to: number): string {
  return block.replace(
    new RegExp(`(<w:abstractNum[^>]*\\sw:abstractNumId=")${from}(")`),
    `$1${to}$2`,
  );
}

function replaceNumId(block: string, from: number, to: number): string {
  let next = block.replace(
    new RegExp(`(<w:num[^>]*\\sw:numId=")${from}(")`),
    `$1${to}$2`,
  );
  next = next.replace(
    new RegExp(`(<w:abstractNumId[^>]*\\sw:val=")(\\d+)(")`),
    (_m, p1: string, val: string, p3: string) => `${p1}${val}${p3}`,
  );
  return next;
}

function replaceNumAbstractRef(block: string, abstractNumId: number): string {
  return block.replace(
    /<w:abstractNumId[^>]*\sw:val="\d+"/,
    `<w:abstractNumId w:val="${abstractNumId}"/>`,
  );
}

/** Merge foreign defs; reallocate abstractNumId/numId on collision with base part. */
export function mergeForeignNumberingPart(
  baseNumberingXml: string,
  foreignNumberingXml: string,
): ForeignNumberingMergeResult {
  const baseAbstract = extractAbstractBlocks(baseNumberingXml);
  const baseNums = extractNumBlocks(baseNumberingXml);
  const foreignAbstract = extractAbstractBlocks(foreignNumberingXml);
  const foreignNums = extractNumBlocks(foreignNumberingXml);

  const abstractNumIdRemap: Record<number, number> = {};
  const numIdRemap: Record<number, number> = {};

  for (const [foreignId, block] of foreignAbstract) {
    const baseBlock = baseAbstract.get(foreignId);
    if (baseBlock !== undefined && baseBlock.trim() === block.trim()) {
      abstractNumIdRemap[foreignId] = foreignId;
      continue;
    }
    if (baseAbstract.has(foreignId)) {
      const allocated = nextId([...baseAbstract.keys(), ...Object.values(abstractNumIdRemap)]);
      abstractNumIdRemap[foreignId] = allocated;
      baseAbstract.set(allocated, replaceAbstractId(block, foreignId, allocated));
    } else {
      abstractNumIdRemap[foreignId] = foreignId;
      baseAbstract.set(foreignId, block);
    }
  }

  for (const [foreignNumId, block] of foreignNums) {
    const foreignAbstractId = Number(
      block.match(/<w:abstractNumId[^>]*\sw:val="(\d+)"/)?.[1] ?? "-1",
    );
    const mappedAbstract =
      abstractNumIdRemap[foreignAbstractId] ??
      (baseAbstract.has(foreignAbstractId) ? foreignAbstractId : foreignAbstractId);

    if (baseNums.has(foreignNumId)) {
      const allocated = nextId([...baseNums.keys(), ...Object.values(numIdRemap)]);
      numIdRemap[foreignNumId] = allocated;
      const patched = replaceNumAbstractRef(replaceNumId(block, foreignNumId, allocated), mappedAbstract);
      baseNums.set(allocated, patched);
    } else {
      numIdRemap[foreignNumId] = foreignNumId;
      baseNums.set(foreignNumId, replaceNumAbstractRef(block, mappedAbstract));
    }
  }

  const abstractBody = [...baseAbstract.values()].join("\n");
  const numBody = [...baseNums.values()].join("\n");
  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
${abstractBody}
${numBody}
</w:numbering>`;

  void parseNumberingAbstractNumIds(numberingXml);
  void parseNumberingNumIds(numberingXml);

  return { numberingXml, abstractNumIdRemap, numIdRemap };
}
