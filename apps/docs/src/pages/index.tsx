import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";

export default function Home(): React.JSX.Element {
  return (
    <Layout title="domdoc SDK" description="Embed the shared document editor in any framework">
      <main className="container margin-vert--xl">
        <h1>domdoc SDK</h1>
        <p className="text-muted-foreground max-w-xl">
          Embed the shared document editor in React, Vue, Svelte, Angular, and seven more frameworks.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="button button--primary" to="/install/">
            Get started
          </Link>
          <Link className="button button--secondary" to="/playground/">
            Open the playground
          </Link>
        </div>
      </main>
    </Layout>
  );
}
