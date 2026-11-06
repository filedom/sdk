import { FiledomError } from "../../errors.js";
import type { AdapterModule } from "../api.js";
import { mboxMessages } from "../codecs.js";
import { openedFile } from "../session.js";
import { MAIL_ADAPTERS } from "../suffixes.js";

export const mboxModule: AdapterModule = {
  id: "mbox",
  role: "both",
  extensions: MAIL_ADAPTERS,
  async open(bytes, name) {
    const messages = mboxMessages(bytes);
    if (messages.length === 0) throw new FiledomError("unsupported", "mailbox is empty");
    return openedFile(name, bytes, "mail", { messages });
  },
  async write(opened) {
    const messages = opened.messages ?? [];
    const text = messages
      .map((message, index) => {
        const from = message.from || "unknown";
        return `From ${from}\nFrom: ${from}\nSubject: ${message.subject}\n\n${message.body}${index === messages.length - 1 ? "" : "\n"}`;
      })
      .join("\n");
    return new TextEncoder().encode(text);
  },
};

export const mailModules = [mboxModule];
