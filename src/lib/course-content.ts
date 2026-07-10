import "server-only";
import { readFile } from "fs/promises";
import path from "path";

// Learning material lives in /content — OUTSIDE the public web root. It is
// never served statically; the only way to reach it is the authenticated,
// subscription-checked route handler at /api/course/content.

const CONTENT_DIR = path.join(process.cwd(), "content");

export async function loadCourseHtml(
  contentPath: string,
  student: { fullName: string; email: string }
): Promise<string> {
  // Guard against path traversal even though contentPath is admin-controlled.
  const resolved = path.resolve(CONTENT_DIR, contentPath);
  if (!resolved.startsWith(CONTENT_DIR + path.sep)) {
    throw new Error("Invalid content path");
  }
  let html = await readFile(resolved, "utf8");

  // Injected protections (deterrents — determined users can always screenshot;
  // the real protection is that the file is only served to authenticated,
  // active subscribers and every access is logged):
  //  - per-student watermark tiled across the page
  //  - right-click / text-selection / print / save shortcuts disabled
  const watermarkText = `${student.fullName} · ${student.email}`;
  const inject = `
<style id="ctc-protect">
  @media print { body { display: none !important; } }
  body { -webkit-user-select: none; user-select: none; }
  #ctc-watermark { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; overflow: hidden; }
  #ctc-watermark span { position: absolute; white-space: nowrap; font: 12px/1 sans-serif;
    color: rgba(139, 147, 167, 0.09); transform: rotate(-24deg); }
</style>
<div id="ctc-watermark" aria-hidden="true"></div>
<script id="ctc-protect-js">
(function () {
  var wm = document.getElementById('ctc-watermark');
  var text = ${JSON.stringify(watermarkText)};
  for (var y = 0; y < 24; y++) {
    for (var x = 0; x < 6; x++) {
      var s = document.createElement('span');
      s.textContent = text;
      s.style.top = (y * 160) + 'px';
      s.style.left = (x * 340 - 60) + 'px';
      wm.appendChild(s);
    }
  }
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'p' || k === 'u')) e.preventDefault();
  });
})();
</script>`;

  if (html.includes("</body>")) {
    html = html.replace("</body>", `${inject}\n</body>`);
  } else {
    html += inject;
  }
  return html;
}
