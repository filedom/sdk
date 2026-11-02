/**
 * /sdk-docs/playground/ — framework rail, live example iframe, and the
 * integration source published by the example-sources plugin.
 * The selected framework is ?fw=. An unknown value uses react.
 */
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import { usePluginData } from "@docusaurus/useGlobalData";
import { FRAMEWORKS, examplePath, type FrameworkId } from "@filedom/ui";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";

/** Plugin name in src/plugins/example-sources.ts. Global data uses this key. */
const EXAMPLE_SOURCES_PLUGIN_NAME = "filedom-example-sources";

/**
 * The server bundle has no window, so the first render stays on react and
 * matches the static HTML. The browser bundle applies ?fw= before paint.
 */
const useQueryLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const FRAMEWORK_LABELS: Record<FrameworkId, string> = {
  react: "React",
  next: "Next.js",
  preact: "Preact",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  sveltekit: "SvelteKit",
  angular: "Angular",
  solid: "Solid",
  lit: "Lit",
  astro: "Astro",
};

interface ExampleFile {
  path: string;
  role: string;
  label: string;
  language: string;
  code: string;
}

interface ExampleSource {
  framework: string;
  label: string;
  logo: string;
  logoSvg: string;
  install: string;
  add: string;
  files: ExampleFile[];
}

interface ExampleSourcesData {
  examples: ExampleSource[];
}

function isFrameworkId(value: string | null): value is FrameworkId {
  return value !== null && (FRAMEWORKS as readonly string[]).includes(value);
}

function useSelectedFramework(): FrameworkId {
  const { search } = useLocation();
  const [framework, setFramework] = useState<FrameworkId>("react");

  useQueryLayoutEffect(() => {
    const requested = new URLSearchParams(search).get("fw");
    const next = isFrameworkId(requested) ? requested : "react";
    setFramework((current) => (current === next ? current : next));
  }, [search]);

  return framework;
}

function FrameworkMark({ svg, label }: { svg?: string; label: string }): React.JSX.Element {
  if (svg?.includes("<svg")) {
    return (
      <img
        alt=""
        width={20}
        height={20}
        draggable={false}
        className="h-5 w-5 shrink-0 object-contain"
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-muted text-[11px] font-medium text-muted-foreground"
    >
      {label.slice(0, 1)}
    </span>
  );
}

function ExampleCode({ example }: { example: ExampleSource }): React.JSX.Element {
  const page = example.files.find((file) => file.role === "page") ?? example.files[0];
  return (
    <Tabs key={example.framework} groupId={`playground-files-${example.framework}`} defaultValue={page ? `file:${page.path}` : "install"}>
      <TabItem value="install" label="Install">
        <CodeBlock language="bash" title="Install">
          {example.install}
        </CodeBlock>
      </TabItem>
      <TabItem value="add" label="Add">
        <CodeBlock language="bash" title="Add">
          {example.add}
        </CodeBlock>
      </TabItem>
      {example.files.map((file) => (
        <TabItem key={file.path} value={`file:${file.path}`} label={file.label} default={file.role === "page"}>
          <CodeBlock language={file.language} title={file.path} showLineNumbers>
            {file.code}
          </CodeBlock>
        </TabItem>
      ))}
    </Tabs>
  );
}

function MissingSource({ label, framework }: { label: string; framework: FrameworkId }): React.JSX.Element {
  return (
    <p className="text-muted-foreground margin-bottom--none">
      {label} integration files are published from its example manifest. Preview loads <code>{examplePath(framework)}</code>.
    </p>
  );
}

export default function Playground(): React.JSX.Element {
  const framework = useSelectedFramework();
  const data = usePluginData(EXAMPLE_SOURCES_PLUGIN_NAME, undefined, { failfast: true }) as ExampleSourcesData;
  const sources = useMemo(() => {
    const map = new Map<string, ExampleSource>();
    for (const example of data.examples ?? []) map.set(example.framework, example);
    return map;
  }, [data.examples]);
  const example = sources.get(framework);
  const label = example?.label || FRAMEWORK_LABELS[framework];

  return (
    <Layout title="Playground" description="Try the filedom viewer in every supported framework" noFooter>
      <div className="flex w-full flex-1 flex-col border-t border-border md:min-h-[calc(100vh_-_var(--ifm-navbar-height))] md:flex-row">
        <nav
          aria-labelledby="playground-frameworks"
          className="menu w-full shrink-0 border-b border-border bg-card md:w-56 md:overflow-y-auto md:border-b-0 md:border-r"
        >
          <p
            id="playground-frameworks"
            className="margin-bottom--none px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Frameworks
          </p>
          <ul className="menu__list mb-0 flex gap-1 overflow-x-auto p-2 md:h-[calc(100vh_-_var(--ifm-navbar-height)_-_2.5rem)] md:flex-col md:overflow-y-auto md:p-3">
            {FRAMEWORKS.map((id) => {
              const source = sources.get(id);
              const name = source?.label || FRAMEWORK_LABELS[id];
              const active = id === framework;
              return (
                <li key={id} className="menu__list-item shrink-0">
                  <Link
                    to={`/playground/?fw=${id}`}
                    className={`menu__link${active ? " menu__link--active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <FrameworkMark svg={source?.logoSvg} label={name} />
                      {name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <section className="flex min-w-0 flex-1 flex-col px-4 py-4">
          <header>
            <h1 className="margin-bottom--xs text-xl font-semibold">Playground</h1>
            <p className="text-muted-foreground margin-bottom--none">{label} example</p>
          </header>
          <Tabs className="margin-top--md" groupId="playground-pane">
            <TabItem value="preview" label="Preview" default>
              <div className="relative min-h-[calc(100vh_-_var(--ifm-navbar-height)_-_11rem)]">
                <iframe
                  title={`${label} example`}
                  src={examplePath(framework)}
                  className="absolute inset-0 h-full w-full rounded-[var(--radius)] border border-border bg-background"
                />
              </div>
            </TabItem>
            <TabItem value="code" label="Code">
              {example ? <ExampleCode example={example} /> : <MissingSource label={label} framework={framework} />}
            </TabItem>
          </Tabs>
        </section>
      </div>
    </Layout>
  );
}
