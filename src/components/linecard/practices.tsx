import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check as CheckIcon, ChevronDown, Minus, X } from "lucide-react";

import { GUIDE, scorePreview, type Check, type CheckStatus } from "@/lib/meta";

const rank: Record<CheckStatus, number> = { fail: 0, warn: 1, note: 2, pass: 3 };

export function Scoreboard({ checks }: { checks: Check[] }) {
  const score = scorePreview(checks);
  return (
    <aside className={`scorecard tone-${score.tone}`} aria-label={`Open Graph score ${score.value} out of 100`}>
      <div className="score-top">
        <p className="score-num">{score.value}</p>
        <div>
          <p className="score-label">{score.label}</p>
          <p className="score-hint">{score.hint}</p>
        </div>
      </div>
      <div className="score-track" aria-hidden="true">
        <span style={{ width: `${score.value}%` }} />
      </div>
      {score.fixes.length > 0 ? (
        <ol className="score-fixes">
          {score.fixes.map((fix, index) => (
            <li key={fix.id} className={fix.status === "fail" ? "fix-bad" : "fix-warn"}>
              <span className="score-n">{index + 1}</span>
              <div>
                <p className="check-title">{fix.title}</p>
                <p className="check-detail">{fix.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="score-clear">Nothing left that would change the card.</p>
      )}
    </aside>
  );
}

export function Practices({ checks }: { checks: Check[] }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const practicesRef = useRef<HTMLDetailsElement>(null);
  const guideRef = useRef<HTMLDetailsElement>(null);
  const open = checks.filter((check) => check.status === "fail" || check.status === "warn");
  const shown = (filter === "open" ? open : checks).slice().sort((a, b) => rank[a.status] - rank[b.status]);

  useEffect(() => {
    const openFromHash = () => {
      if (location.hash === "#practices" && practicesRef.current) practicesRef.current.open = true;
      if (location.hash === "#guide" && guideRef.current) guideRef.current.open = true;
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return (
    <section className="practices" id="practices" aria-label="Best practices">
      <details className="fold" ref={practicesRef}>
        <summary>
          <span>Practices</span>
          <span className="fold-side">
            <span className="fold-meta">{open.length ? `${open.length} to fix` : "All clear"}</span>
            <ChevronDown className="chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </summary>
        <div className="fold-body">
          <div className="filters" role="tablist">
            <button
              type="button"
              className={filter === "open" ? "btn btn-small btn-pressed" : "btn btn-small"}
              onClick={() => setFilter("open")}
            >
              To fix
              {open.length ? ` · ${open.length}` : ""}
            </button>
            <button
              type="button"
              className={filter === "all" ? "btn btn-small btn-pressed" : "btn btn-small"}
              onClick={() => setFilter("all")}
            >
              All checks
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="quiet">Nothing to fix on this card.</p>
          ) : (
            <ul className="check-list">
              {shown.map((check) => (
                <li key={check.id} className="check">
                  <Status status={check.status} />
                  <div>
                    <p className="check-kicker">{check.group}</p>
                    <p className="check-title">{check.title}</p>
                    <p className="check-detail">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="fold" id="guide" ref={guideRef}>
        <summary>
          <span>Field guide</span>
          <span className="fold-side">
            <span className="fold-meta">{GUIDE.length} chapters</span>
            <ChevronDown className="chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </summary>
        <div className="fold-body">
          {GUIDE.map((group) => (
            <details key={group.index} className="chapter">
              <summary>
                <span>
                  <span className="idx">{group.index}</span>
                  {group.title}
                </span>
                <ChevronDown className="chevron" size={15} strokeWidth={1.75} aria-hidden="true" />
              </summary>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ))}
          <div className="sources">
            <a href="https://ogp.me/" target="_blank" rel="noreferrer">
              Open Graph protocol
            </a>
            <a href="https://developers.google.com/search/docs/appearance/snippet" target="_blank" rel="noreferrer">
              Google snippet docs
            </a>
            <a href="https://developers.facebook.com/docs/sharing/webmasters" target="_blank" rel="noreferrer">
              Facebook sharing guide
            </a>
          </div>
        </div>
      </details>
    </section>
  );
}

function Status({ status }: { status: CheckStatus }) {
  const label = status === "pass" ? "Pass" : status === "warn" ? "Watch" : status === "fail" ? "Fix" : "Note";
  return (
    <span className="mark" title={label} aria-label={label}>
      {status === "pass" ? (
        <CheckIcon size={16} strokeWidth={2.25} aria-hidden="true" />
      ) : status === "fail" ? (
        <X size={16} strokeWidth={2.25} aria-hidden="true" />
      ) : status === "warn" ? (
        <AlertTriangle size={16} strokeWidth={2.25} aria-hidden="true" />
      ) : (
        <Minus size={16} strokeWidth={2.25} aria-hidden="true" />
      )}
    </span>
  );
}