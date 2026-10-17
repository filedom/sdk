import { describe, expect, it } from "vitest";
import {
  COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
  dispatchCommentPanelAcceptAction,
} from "./comment-panel-accept-action-stub.js";

describe("M2/F20 comment panel accept action stub", () => {
  it("records accept without OPC write-back", () => {
    const result = dispatchCommentPanelAcceptAction("0");
    expect(result.featureId).toBe(COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID);
    expect(result.applied).toBe(true);
    expect(result.action).toBe("accept-stub");
    expect(result.detail).toBe("accept-recorded-no-opc-mutation");
  });

  it("rejects empty comment id", () => {
    const result = dispatchCommentPanelAcceptAction("  ");
    expect(result.applied).toBe(false);
    expect(result.detail).toBe("missing-comment-id");
  });
});
