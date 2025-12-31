function extractCreator(card) {
  if (!card) return { name: "Unknown", handle: "" };

  // 1) Prefer site-specific hover-card creator element
  const hoverEl = card.querySelector('a[data-slot="hover-card-trigger"] span.block.truncate');
  if (hoverEl) {
    let txt = hoverEl.innerText.trim();
    // parse "Name (@handle)" format
    const m = txt.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
    if (m) return { name: m[1].trim(), handle: "@" + m[2].trim() };
    return { name: txt, handle: "" };
  }

  // 2) Original fallback: look for "Created by"
  const createdNodes = Array.from(card.querySelectorAll("*")).filter(n => /Created by/i.test(n.innerText || ""));
  for (const createdNode of createdNodes) {
    let node = createdNode.nextElementSibling;
    if (node) {
      const lines = linesFrom(node);
      if (lines.length >= 1) {
        let name = lines[0];
        let handle = lines.length >= 2 ? lines[1] : "";
        const combinedMatch = name.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
        if (combinedMatch) {
          name = combinedMatch[1].trim();
          handle = "@" + combinedMatch[2].trim();
        } else {
          const hm = handle.match(/@[\w-]+/);
          handle = hm ? hm[0] : handle.trim();
        }
        return { name: (name || "Unknown").trim(), handle: (handle || "").trim() };
      }
    }
  }

  // 3) fallback regex on full card text
  const txt = card.innerText || card.textContent || "";
  const m = txt.match(/Created by[\s\r\n]+([^\r\n]+)(?:[\r\n]+([^\r\n]+))?/i);
  if (m) {
    const nameRaw = (m[1] || "").trim();
    const handleRaw = (m[2] || "").trim();
    const combinedMatch = nameRaw.match(/^(.+?)\s*\(?@?([\w-]+)\)?$/);
    if (combinedMatch) return { name: combinedMatch[1].trim(), handle: "@" + combinedMatch[2].trim() };
    const hm = handleRaw.match(/@[\w-]+/);
    return { name: (nameRaw || "Unknown"), handle: hm ? hm[0] : handleRaw };
  }

  return { name: "Unknown", handle: "" };
}
