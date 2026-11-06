import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Nightjar: built for the hour after dusk";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Big Shoulders Black (Google Fonts, SIL Open Font License 1.1), used only to render this card.
/** Social card: the night garage in one frame. Spotlight, chrome wordmark, tagline. */
/** Cached so the card prerenders at build time instead of reading the font per request. */
async function displayFont() {
  "use cache";
  const buf = await readFile(join(process.cwd(), "src/app/_og/BigShoulders-Black.ttf"));
  return new Uint8Array(buf);
}

export default async function Image() {
  const display = (await displayFont()).buffer as ArrayBuffer;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#040405",
        backgroundImage:
          "radial-gradient(ellipse 620px 420px at 50% 0%, rgba(244,241,234,0.26), rgba(244,241,234,0.06) 55%, rgba(4,4,5,0) 100%)",
        fontFamily: "Big Shoulders",
        position: "relative",
      }}
    >
      {/* Floor glow under the spot. */}
      <div
        style={{
          position: "absolute",
          left: 250,
          bottom: 40,
          width: 700,
          height: 120,
          borderRadius: "50%",
          backgroundImage: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,59,31,0.18) 0%, rgba(4,4,5,0) 100%)",
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 210,
          fontWeight: 900,
          letterSpacing: 4,
          lineHeight: 1,
          textTransform: "uppercase",
          color: "transparent",
          backgroundImage:
            "linear-gradient(180deg, #ffffff 0%, #d9dde6 30%, #7b8190 48%, #15171c 51%, #4a4e58 62%, #c9ced8 86%, #ffffff 100%)",
          backgroundClip: "text",
        }}
      >
        NIGHTJAR
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
        <div style={{ width: 48, height: 2, background: "#ff3b1f", marginRight: 20 }} />
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 6, color: "#c8ccd3", textTransform: "uppercase" }}>
          Built for the hour after dusk.
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Big Shoulders", data: display, style: "normal", weight: 900 }],
    },
  );
}
