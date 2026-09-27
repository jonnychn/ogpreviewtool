import { useEffect, useState } from "react";

import { proxySrc, type Resolved } from "@/lib/meta";

export function Previews({
  card,
  onUsePagePhoto,
}: {
  card: Resolved;
  onUsePagePhoto?: () => void;
}) {
  const [guides, setGuides] = useState(false);
  const title = card.ogTitle || "Add a title";
  const description = card.ogDescription || "Add a description";
  const host = card.host || "example.com";
  const xTitle = card.twitterTitle || "Add a title";
  const xDesc = card.twitterDescription || "Add a description";
  const emptyTitle = !card.ogTitle;
  const emptyDesc = !card.ogDescription;

  return (
    <section className="previews" id="previews" aria-label="Live previews">
      <div className="col-head">
        <h2>Live cards</h2>
        <button
          type="button"
          className={guides ? "btn btn-small btn-pressed" : "btn btn-small"}
          aria-pressed={guides}
          onClick={() => setGuides((value) => !value)}
        >
          Crop guides
        </button>
      </div>
      <div className="proofs">
        <article>
          <div className="proof-label">
            <strong>Google</strong>
            <span>Search</span>
          </div>
          <div className="g-card">
            <div className="g-url">
              <Favicon card={card} />
              <div className="g-id">
                <div className="g-host">{host}</div>
                <div className="g-path">{card.path || "/"}</div>
              </div>
            </div>
            <h3 className={card.title ? "g-title clamp" : "g-title clamp ghost"}>
              {card.title || "Add a title"}
            </h3>
            <p className={card.description ? "g-desc clamp" : "g-desc clamp ghost"}>
              {card.description || "Add a description"}
            </p>
          </div>
          <p className="proof-note">One line for the title. About two for the description.</p>
        </article>

        <article>
          <div className="proof-label">
            <strong>Facebook</strong>
            <span>1.91:1</span>
          </div>
          <div className="fb-card">
            <Frame src={card.previewImage} alt={card.imageAlt} ratio="1.91" guides={guides} />
            <div className="fb-body">
              <p className="fb-host">{host}</p>
              <h3 className={emptyTitle ? "fb-title clamp ghost" : "fb-title clamp"}>{title}</h3>
              <p className={emptyDesc ? "fb-desc clamp ghost" : "fb-desc clamp"}>{description}</p>
            </div>
          </div>
          <p className="proof-note">Image is cropped to 1.91:1. The description is easy to lose.</p>
        </article>

        <article>
          <div className="proof-label">
            <strong>X</strong>
            <span>{card.card === "summary" ? "Summary" : "Large image"}</span>
          </div>
          {card.card === "summary" ? (
            <div className="x-card x-row">
              <div className="x-body">
                <p className="x-host">{host}</p>
                <h3 className={card.twitterTitle ? "x-title clamp" : "x-title clamp ghost"}>{xTitle}</h3>
                <p className={card.twitterDescription ? "x-desc clamp" : "x-desc clamp ghost"}>{xDesc}</p>
              </div>
              <div className="x-thumb">
                <Frame src={card.previewImage} alt={card.imageAlt} ratio="1" guides={guides} />
              </div>
            </div>
          ) : (
            <div className="x-card">
              <Frame src={card.previewImage} alt={card.imageAlt} ratio="1.91" guides={guides} />
              <div className="x-body">
                <p className="x-host">{host}</p>
                <h3 className={card.twitterTitle ? "x-title clamp" : "x-title clamp ghost"}>{xTitle}</h3>
              </div>
            </div>
          )}
          <p className="proof-note">
            {card.card === "summary"
              ? "Small square. The description can show."
              : "Large cards hide the description. The title has to carry it."}
          </p>
        </article>

        <article>
          <div className="proof-label">
            <strong>LinkedIn</strong>
            <span>1.91:1</span>
          </div>
          <div className="li-card">
            <Frame src={card.previewImage} alt={card.imageAlt} ratio="1.91" guides={guides} />
            <div className="li-body">
              <h3 className={emptyTitle ? "li-title clamp ghost" : "li-title clamp"}>{title}</h3>
              <p className="li-host">{host}</p>
            </div>
          </div>
          <p className="proof-note">Same crop as Facebook. Titles past ~70 characters get cut.</p>
        </article>

        <article>
          <div className="proof-label">
            <strong>Slack</strong>
            <span>Unfurl</span>
          </div>
          <div className="sl-card">
            <p className="sl-site">{card.siteName || host}</p>
            <h3 className={emptyTitle ? "sl-title clamp ghost" : "sl-title clamp"}>{title}</h3>
            <p className={emptyDesc ? "sl-desc clamp ghost" : "sl-desc clamp"}>{description}</p>
            <Frame src={card.previewImage} alt={card.imageAlt} ratio="1.91" guides={guides} />
          </div>
          <p className="proof-note">About two lines of description, then the image.</p>
        </article>

        <article>
          <div className="proof-label">
            <strong>Discord</strong>
            <span>Embed</span>
          </div>
          <div className="dc-card">
            <p className="dc-site">{card.siteName || host}</p>
            <h3 className={emptyTitle ? "dc-title clamp ghost" : "dc-title clamp"}>{title}</h3>
            <p className={emptyDesc ? "dc-desc clamp ghost" : "dc-desc clamp"}>{description}</p>
            <Frame src={card.previewImage} alt={card.imageAlt} ratio="1.91" guides={guides} />
          </div>
          <p className="proof-note">Site name on top, then title, then a longer description.</p>
        </article>

        <article>
          <div className="proof-label">
            <strong>iMessage</strong>
            <span>{card.imessageBorrowed ? "Page photo" : "Taller crop"}</span>
          </div>
          <div className="im-bubble">
            <div className="im-card">
              {card.imessageImage ? (
                <Frame
                  src={card.imessageImage}
                  alt={card.imageAlt}
                  ratio="1.55"
                  guides={guides}
                  face
                />
              ) : null}
              <div className="im-body">
                <h3 className={emptyTitle ? "im-title clamp ghost" : "im-title clamp"}>{title}</h3>
                <p className="im-host">{host}</p>
              </div>
            </div>
          </div>
          <p className="proof-note">
            {card.imessageBorrowed
              ? "No og:image, so iMessage borrowed a photo from the page. The face stays because this crop is taller than Facebook."
              : "Title and domain only. The picture is cropped taller than the Facebook card."}
          </p>
          {card.imessageBorrowed && onUsePagePhoto ? (
            <button type="button" className="btn btn-small" onClick={onUsePagePhoto}>
              Use this photo
            </button>
          ) : null}
        </article>

        <article>
          <div className="proof-label">
            <strong>WhatsApp</strong>
            <span>{card.previewImage ? "1.91:1" : "Text only"}</span>
          </div>
          <div className="wa-bubble">
            <div className="wa-card">
              {card.previewImage ? (
                <Frame src={card.previewImage} alt={card.imageAlt} ratio="1.91" guides={guides} />
              ) : null}
              <div className="wa-body">
                <h3 className={emptyTitle ? "wa-title clamp ghost" : "wa-title clamp"}>{title}</h3>
                <p className={emptyDesc ? "wa-desc clamp ghost" : "wa-desc clamp"}>{description}</p>
                <p className="wa-host">{host}</p>
              </div>
            </div>
          </div>
          <p className="proof-note">
            {card.previewImage
              ? "Uses the share image only. About two lines of description, then the domain."
              : "No og:image, so WhatsApp stays text. It will not use the photo iMessage found."}
          </p>
        </article>
      </div>
    </section>
  );
}

function Frame({
  src,
  alt,
  ratio,
  guides,
  face,
}: {
  src: string;
  alt: string;
  ratio: string;
  guides: boolean;
  face?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <div className={face ? "frame frame-face" : "frame"} style={{ ["--ar" as string]: ratio }}>
      {src && !broken ? (
        <img src={src} alt={alt} onError={() => setBroken(true)} />
      ) : (
        <div className="frame-empty">No image</div>
      )}
      {guides && src && !broken ? <div className="crop-guide" aria-hidden="true" /> : null}
    </div>
  );
}

function Favicon({ card }: { card: Resolved }) {
  const [broken, setBroken] = useState(false);
  const src = proxySrc(card.favicon);
  useEffect(() => setBroken(false), [src]);
  const letter = (card.siteName || card.host || "L").slice(0, 1).toUpperCase();
  return (
    <div className="g-fav" aria-hidden="true">
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : letter}
    </div>
  );
}
