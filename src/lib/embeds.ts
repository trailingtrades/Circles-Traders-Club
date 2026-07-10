// Converts share/watch URLs into privacy-friendly embeddable URLs.
// Returns null if the URL isn't recognised as embeddable (LINK-style fallback).

export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
    } else if (u.hostname === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0];
    }
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  } catch {
    return null;
  }
}

export function vimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return null;
    if (u.hostname === "player.vimeo.com" && u.pathname.startsWith("/video/")) return url;
    const m = u.pathname.match(/^\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (!m) return null;
    return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  } catch {
    return null;
  }
}

// Google Sheets/Docs/Slides "…/edit?usp=sharing" links refuse to render inside
// an iframe; the "/preview" form embeds cleanly (read-only).
export function googleEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "docs.google.com") return null;
    const m = u.pathname.match(/^\/(spreadsheets|document|presentation)\/d\/([^/]+)/);
    if (!m) return null;
    return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
  } catch {
    return null;
  }
}

export function videoEmbedUrl(url: string): string | null {
  return youtubeEmbedUrl(url) ?? vimeoEmbedUrl(url);
}

// Best embeddable URL for a material's `url` by its type; null → open as link.
export function embedUrlFor(type: "VIDEO" | "SHEET" | "LINK", url: string): string | null {
  if (type === "VIDEO") return videoEmbedUrl(url);
  if (type === "SHEET") return googleEmbedUrl(url);
  return null;
}
