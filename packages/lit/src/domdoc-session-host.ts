import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface DomdocLitSessionContext {
  sessionId: string;
  surface: "framework-adapter-stub";
}

@customElement("domdoc-session-host")
export class DomdocSessionHost extends LitElement {
  @property({ type: String, attribute: "session-id" })
  sessionId = "";

  get sessionContext(): DomdocLitSessionContext {
    return { sessionId: this.sessionId, surface: "framework-adapter-stub" };
  }

  render() {
    return html`<slot></slot>`;
  }
}

export function domdocLitAdapterDemoSurface(sessionId: string): DomdocLitSessionContext {
  return { sessionId, surface: "framework-adapter-stub" };
}

declare global {
  interface HTMLElementTagNameMap {
    "domdoc-session-host": DomdocSessionHost;
  }
}
