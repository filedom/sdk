import { describe, expect, it } from "vitest";
import { readCommentsPartStub } from "./comments-part-stub.js";

/** F20 comment portability stub (D04 read-only awareness). */
describe("F20 comments part stub", () => {
  it("counts comment elements and marks part absent when missing", () => {
    const members = new Map<string, Uint8Array>();
    expect(readCommentsPartStub(members).present).toBe(false);
    members.set(
      "word/comments.xml",
      new TextEncoder().encode(
        `<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:comment w:id="0" w:author="a"/><w:comment w:id="1" w:author="b"/>
        </w:comments>`,
      ),
    );
    const stub = readCommentsPartStub(members);
    expect(stub.present).toBe(true);
    expect(stub.commentCount).toBe(2);
    expect(stub.partPath).toBe("word/comments.xml");
  });
});
