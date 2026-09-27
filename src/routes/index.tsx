import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { Editor } from "@/components/linecard/editor";
import { Practices, Scoreboard } from "@/components/linecard/practices";
import { Previews } from "@/components/linecard/previews";
import { analyzeUrl } from "@/lib/analyze.functions";
import {
  BLANK,
  SAMPLE,
  draftFromPage,
  evaluate,
  resolve,
  type Draft,
  type ImageProbe,
} from "@/lib/meta";

export const Route = createFileRoute("/")({ component: Home });

const STORAGE_KEY = "linecard.draft.v1";

function Home() {
  const [draft, setDraft] = useState<Draft>(SAMPLE);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"ok" | "bad">("ok");
  const [probe, setProbe] = useState<ImageProbe>({ state: "none" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>;
        setDraft({
          ...SAMPLE,
          ...saved,
          imageUpload: null,
          imageName: "",
          imageBytes: null,
          rawTags: Array.isArray(saved.rawTags) ? saved.rawTags : [],
        });
      }
    } catch {
      /* keep the sample */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stored = { ...draft, imageUpload: null, imageBytes: null, imageName: "" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [draft, hydrated]);

  const resolved = useMemo(() => resolve(draft), [draft]);
  const checks = useMemo(() => evaluate(draft, probe), [draft, probe]);

  useEffect(() => {
    const src = resolved.previewImage;
    if (!src) {
      setProbe({ state: "none" });
      return;
    }
    let cancel = false;
    setProbe({ state: "loading" });
    const img = new Image();
    img.onload = () => {
      if (cancel) return;
      if (!img.naturalWidth || !img.naturalHeight) setProbe({ state: "error" });
      else setProbe({ state: "ok", width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancel) setProbe({ state: "error" });
    };
    img.src = src;
    return () => {
      cancel = true;
    };
  }, [resolved.previewImage]);

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function read(event?: FormEvent) {
    event?.preventDefault();
    const url = draft.url.trim();
    if (!url) {
      setTone("bad");
      setMessage("Paste a public URL first.");
      return;
    }
    setBusy(true);
    setTone("ok");
    setMessage("Reading the page…");
    try {
      const result = await analyzeUrl({ data: { url } });
      if (!result.ok) {
        setTone("bad");
        setMessage(result.error);
        return;
      }
      setDraft(draftFromPage(result.page));
      setTone("ok");
      const host = (() => {
        try {
          return new URL(result.page.finalUrl).hostname.replace(/^www\./, "");
        } catch {
          return "that page";
        }
      })();
      const count = result.page.tags.length;
      setMessage(
        result.page.note ||
          `Read ${count} ${count === 1 ? "tag" : "tags"} from ${host}. Edit anything — the cards follow.`,
      );
      if (window.innerWidth < 860) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById("previews")?.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start",
        });
      }
    } catch (error) {
      setTone("bad");
      setMessage(error instanceof Error ? error.message : "Could not read that page.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <a className="skip" href="#edit">
        Skip to the tags
      </a>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Linecard home">
          <span className="brand-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
              <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          Linecard
        </a>
        <span className="header-label">URL → card</span>
      </header>
      <main className="page">
        <section className="intro">
          <h1>Proof the card before you share it.</h1>
          <p className="lede">
            Paste a public page. Linecard reads the tags, then lets you edit them while Google, Facebook, X,
            LinkedIn, Slack, Discord, iMessage, and WhatsApp update live.
          </p>
        </section>
        <form className="url-form" onSubmit={(event) => void read(event)}>
          <div className="url-row">
            <input
              className="input"
              aria-label="Page URL"
              placeholder="https://"
              value={draft.url}
              spellCheck={false}
              onChange={(event) => patch({ url: event.target.value })}
            />
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Reading…" : "Read page"}
            </button>
          </div>
          <div className="jumps">
            <a href="#previews">See the cards</a>
            <a href="#edit">Edit the tags</a>
            <a href="#practices">Practices</a>
          </div>
        </form>
        {message ? (
          <p className={tone === "bad" ? "banner" : "quiet"} role="status">
            {message}
          </p>
        ) : null}
        {draft.rawTags.length > 0 ? (
          <details className="raw">
            <summary>
              {draft.rawTags.length} {draft.rawTags.length === 1 ? "tag" : "tags"} found on the page
            </summary>
            <ul>
              {draft.rawTags.map((tag, index) => (
                <li key={`${tag.key}-${index}`}>
                  <span>{tag.key}</span>
                  <span>{tag.value}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="workspace">
          <Editor
            draft={draft}
            resolved={resolved}
            probe={probe}
            onChange={patch}
            onSample={() => {
              setDraft(SAMPLE);
              setMessage("");
            }}
            onBlank={() => {
              setDraft(BLANK);
              setMessage("");
            }}
          />
          <div className="proof-col">
            <Scoreboard checks={checks} />
            <Previews
              card={resolved}
              onUsePagePhoto={
                resolved.imessageBorrowed ? () => patch({ imageUrl: draft.contentImage }) : undefined
              }
            />
          </div>
        </div>
        <Practices checks={checks} />
        <footer className="foot">
          <Lock size={15} strokeWidth={1.7} aria-hidden="true" />
          <p>The draft stays in this browser. The page you read is not stored.</p>
        </footer>
      </main>
    </>
  );
}
