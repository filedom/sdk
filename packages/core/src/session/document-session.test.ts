import { describe, expect, it } from "vitest";
import { createDocumentSession } from "./document-session.js";
import {
  createDomdocPackageBlobIndexStub,
  createDomdocPackageManifestStub,
  createDomdocPackagePersistPlanStub,
  DOMDOC_CRASH_SAFE_COMMIT_STEPS,
  serializeDomdocPackageManifestStub,
} from "../persistence/domdoc-package-stub.js";
import { readOpcPackage, writeOpcPackage } from "../formats/docx/opc-package.js";
import { DOCX_NUMBERING_PART } from "../formats/docx/docx-numbering-opc-patch.js";

describe("M1 DocumentSession skeleton", () => {
  const base = {
    documentId: "doc-1",
    kind: "flow" as const,
    revisions: {
      committedRevision: 1,
      persistedRevision: 0,
      materializedRevision: 1,
      exportedRevision: 0,
      sharedRevision: null,
      renderedRevision: 1,
    },
  };

  it("commits projection stub revisions", () => {
    const session = createDocumentSession(base);
    const next = session.commitDocxProjectionStub({
      kind: "docx-projection-sync",
      targetRevision: 2,
      paragraphTexts: ["a"],
      listMarkers: [""],
    });
    expect(next.revisions.committedRevision).toBe(2);
  });

  it("builds domdoc package manifest stub", () => {
    const manifest = createDomdocPackageManifestStub(base);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.documentId).toBe("doc-1");
    expect(manifest.requiredMembers).toContain("state/");
  });

  it("serializes manifest.json UTF-8 write stub (M1)", () => {
    const bytes = serializeDomdocPackageManifestStub(base);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { documentId: string };
    expect(parsed.documentId).toBe("doc-1");
  });

  it("builds domdoc blob index stub", () => {
    const index = createDomdocPackageBlobIndexStub(base);
    expect(index.members.length).toBeGreaterThanOrEqual(5);
  });

  it("builds crash-safe persist plan stub (§13.2)", () => {
    const plan = createDomdocPackagePersistPlanStub(base);
    expect(plan.commitSteps).toEqual([...DOMDOC_CRASH_SAFE_COMMIT_STEPS]);
    expect(plan.recoveryPolicy).toBe("committed-manifest-only");
  });

  it("patches numbering.xml when committing list renumber", () => {
    const session = createDocumentSession(base);
    const pkg = readOpcPackage(writeOpcPackage({ members: new Map() }));
    const { session: next, pkg: patched } = session.applyDocxListRenumberOpcPatch(pkg, {
      kind: "docx-list-renumber-stub",
      numId: 2,
      markers: ["1. "],
    });
    expect(next.revisions.committedRevision).toBe(2);
    const xml = new TextDecoder().decode(patched.members.get(DOCX_NUMBERING_PART)!);
    expect(xml).toContain("domdoc:list-renumber");
  });
});
