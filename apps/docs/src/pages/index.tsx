import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Embed the shared document editor"
      description="Embed the shared document editor in React, Vue, Svelte, Angular, and seven more frameworks."
    >
      <main className="container margin-vert--xl">
        <h1>FileDOM SDK</h1>
        <p className="text-muted-foreground max-w-xl">
          Embed the shared document editor in React, Vue, Svelte, Angular, and seven more frameworks.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="button button--primary" to="/install/">
            Get started
          </Link>
          <a className="button button--secondary" href="/sdk/integrations">
            Open the integrations
          </a>
        </div>
      </main>
    </Layout>
  );
}
