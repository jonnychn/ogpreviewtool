import { useId, useState, type DragEvent } from "react";

import {
  chars,
  formatBytes,
  type Draft,
  type ImageProbe,
  type Resolved,
  buildMarkup,
} from "@/lib/meta";

type EditorProps = {
  draft: Draft;
  resolved: Resolved;
  probe: ImageProbe;
  onChange: (patch: Partial<Draft>) => void;
  onSample: () => void;
  onBlank: () => void;
};

export function Editor({ draft, resolved, probe, onChange, onSample, onBlank }: EditorProps) {
  const [drag, setDrag] = useState(false);
  const [fileError, setFileError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileId = useId();
  const markup = buildMarkup(draft, probe);

  function takeFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("That file isn't an image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError("Keep the image under 8 MB.");
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        imageUpload: typeof reader.result === "string" ? reader.result : null,
        imageName: file.name,
        imageBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDrag(false);
    takeFile(event.dataTransfer.files?.[0]);
  }

  function downloadCrop() {
    const src = resolved.previewImage;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx || !img.naturalWidth) {
        setFileError("Couldn't export that image.");
        return;
      }
      ctx.fillStyle = "#f3f3f1";
      ctx.fillRect(0, 0, 1200, 630);
      const scale = Math.max(1200 / img.naturalWidth, 630 / img.naturalHeight);
      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;
      ctx.drawImage(img, (1200 - width) / 2, (630 - height) / 2, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          setFileError("Couldn't export that image.");
          return;
        }
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "og-1200x630.png";
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.onerror = () => setFileError("Couldn't export that image. Try a JPG or PNG.");
    img.src = src;
  }

  async function copyMarkup() {
    try {
      await navigator.clipboard.writeText(markup);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFileError("Clipboard blocked. Select the tags and copy them.");
    }
  }

  const sizeLabel =
    probe.state === "ok"
      ? `${probe.width} × ${probe.height} · ${(probe.width / probe.height).toFixed(2)}:1`
      : probe.state === "loading"
        ? "Checking size…"
        : probe.state === "error"
          ? "Image didn't load"
          : "No image yet";

  return (
    <section className="panel" id="edit">
      <div className="panel-head">
        <h2>Tags</h2>
        <div className="head-actions">
          <button type="button" className="btn-ghost" onClick={onSample}>
            Sample
          </button>
          <button type="button" className="btn-ghost" onClick={onBlank}>
            Clear
          </button>
        </div>
      </div>
      <div className="stack">
        <Field
          label="Page title"
          value={draft.title}
          max={60}
          onChange={(title) => onChange({ title })}
          placeholder="The thing, said plainly"
        />
        <Field
          label="Meta description"
          value={draft.description}
          max={160}
          multiline
          onChange={(description) => onChange({ description })}
          placeholder="Why this page is worth opening"
        />
        <Field
          label="Site name"
          value={draft.siteName}
          onChange={(siteName) => onChange({ siteName })}
          placeholder={resolved.host || "Brand"}
          hint="Used by Slack and Discord. Falls back to the domain."
        />
        <div className="field">
          <div className="field-top">
            <strong>Share image</strong>
            <span>{sizeLabel}</span>
          </div>
          <Field
            label="Image URL"
            hideLabel
            value={draft.imageUrl}
            onChange={(imageUrl) => onChange({ imageUrl })}
            placeholder="https://cdn.example.com/og.jpg"
          />
          {resolved.previewImage ? (
            <div className="full-image">
              <img src={resolved.previewImage} alt={resolved.imageAlt || ""} />
              <div className="image-meta">
                <span>{draft.imageName || (resolved.localSample ? "Sample artwork" : "Linked image")}</span>
                <span>{draft.imageBytes != null ? formatBytes(draft.imageBytes) : sizeLabel}</span>
              </div>
            </div>
          ) : (
            <label
              className={drag ? "drop dragging" : "drop"}
              htmlFor={fileId}
              onDragOver={(event) => {
                event.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
            >
              <strong>Drop an image</strong>
              <span>or click to upload a preview</span>
            </label>
          )}
          <input
            id={fileId}
            className="file-input"
            type="file"
            accept="image/*"
            onChange={(event) => takeFile(event.target.files?.[0])}
          />
          <div className="image-actions">
            <label className="btn btn-small" htmlFor={fileId}>
              Upload
            </label>
            <button type="button" className="btn btn-small" onClick={downloadCrop} disabled={!resolved.previewImage}>
              Download 1200×630
            </button>
            {draft.imageUpload ? (
              <button
                type="button"
                className="btn btn-small"
                onClick={() => onChange({ imageUpload: null, imageName: "", imageBytes: null })}
              >
                Remove upload
              </button>
            ) : null}
          </div>
          {resolved.usingUpload ? (
            <p className="field-hint">
              The cards are showing this upload. Copied tags still need a public https URL.
            </p>
          ) : null}
          {fileError ? <p className="file-error">{fileError}</p> : null}
        </div>
        <Field
          label="Image alt"
          value={draft.imageAlt}
          onChange={(imageAlt) => onChange({ imageAlt })}
          placeholder="What the picture shows"
        />
        <div className="pair">
          <label className="field">
            <span className="field-top">
              <strong>X card</strong>
            </span>
            <select
              className="input"
              value={draft.card}
              onChange={(event) =>
                onChange({ card: event.target.value === "summary" ? "summary" : "summary_large_image" })
              }
            >
              <option value="summary_large_image">Large image</option>
              <option value="summary">Small square</option>
            </select>
          </label>
          <label className="field">
            <span className="field-top">
              <strong>og:type</strong>
            </span>
            <select className="input" value={draft.ogType} onChange={(event) => onChange({ ogType: event.target.value })}>
              <option value="website">website</option>
              <option value="article">article</option>
              <option value="product">product</option>
              <option value="profile">profile</option>
              <option value="book">book</option>
            </select>
          </label>
        </div>
        <details className="overrides">
          <summary>Override a single network</summary>
          <div className="stack">
            <Override
              label="og:title"
              value={draft.ogTitle}
              fallback={draft.title}
              max={70}
              onChange={(ogTitle) => onChange({ ogTitle })}
            />
            <Override
              label="og:description"
              value={draft.ogDescription}
              fallback={draft.description}
              max={200}
              multiline
              onChange={(ogDescription) => onChange({ ogDescription })}
            />
            <Override
              label="og:url"
              value={draft.ogUrl}
              fallback={draft.url}
              onChange={(ogUrl) => onChange({ ogUrl })}
            />
            <Override
              label="twitter:title"
              value={draft.twitterTitle}
              fallback={resolved.ogTitle}
              max={70}
              onChange={(twitterTitle) => onChange({ twitterTitle })}
            />
            <Override
              label="twitter:description"
              value={draft.twitterDescription}
              fallback={resolved.ogDescription}
              max={200}
              multiline
              onChange={(twitterDescription) => onChange({ twitterDescription })}
            />
            <Override
              label="twitter:image"
              value={draft.twitterImage}
              fallback={draft.imageUrl}
              onChange={(twitterImage) => onChange({ twitterImage })}
            />
            <div className="pair">
              <Field
                label="twitter:site"
                value={draft.twitterSite}
                onChange={(twitterSite) => onChange({ twitterSite })}
                placeholder="@handle"
              />
              <Field
                label="og:locale"
                value={draft.locale}
                onChange={(locale) => onChange({ locale })}
                placeholder="en_US"
              />
            </div>
            <div className="pair">
              <Field
                label="robots"
                value={draft.robots}
                onChange={(robots) => onChange({ robots })}
                placeholder="index, follow"
              />
              <Field label="author" value={draft.author} onChange={(author) => onChange({ author })} />
            </div>
          </div>
        </details>
        <div className="markup-wrap">
          <div className="field-top">
            <strong>Head tags</strong>
            <button type="button" className="btn btn-small" onClick={() => void copyMarkup()}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="markup">{markup}</pre>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  multiline,
  placeholder,
  hint,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  hideLabel?: boolean;
}) {
  const id = useId();
  const count = chars(value);
  return (
    <label className="field" htmlFor={id}>
      <span className="field-top">
        <strong className={hideLabel ? "sr-only" : undefined}>{label}</strong>
        {max ? (
          <span className={count > max ? "count count-over" : "count"}>
            <b className="tabular-nums">{count}</b>/{max}
          </span>
        ) : (
          <span />
        )}
      </span>
      {multiline ? (
        <textarea
          id={id}
          className="input"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function Override({
  label,
  value,
  fallback,
  onChange,
  max,
  multiline,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  max?: number;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span className="field-top">
        <strong>{label}</strong>
        {value ? (
          max ? (
            <span className={chars(value) > max ? "count count-over" : "count"}>
              <b>{chars(value)}</b>/{max}
            </span>
          ) : (
            <span />
          )
        ) : (
          <span className="inherited">Inherited · {chars(fallback)}</span>
        )}
      </span>
      {multiline ? (
        <textarea
          id={id}
          className="input"
          value={value}
          placeholder={fallback || "Same as the page"}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          value={value}
          placeholder={fallback || "Same as the page"}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
