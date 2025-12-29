(() => {
  /* ---------------- RESOLUTION ---------------- */
  function deepResolve(v, pool) {
    if (typeof v === "number") return deepResolve(pool[v], pool);
    if (Array.isArray(v)) return v.map(x => deepResolve(x, pool));
    if (v && typeof v === "object") {
      const o = {};
      for (const k in v) o[k] = deepResolve(v[k], pool);
      return o;
    }
    return v;
  }

  /* ---------------- GET COINS ---------------- */
  async function getAllCoins(username) {
    try {
      const res = await fetch(`https://rugplay.com/user/${username}/__data.json`);
      if (!res.ok) throw new Error("Failed to fetch user data");

      const json = await res.json();
      const node = json.nodes.find(n => n.type === "data" && n.data?.[2]);
      if (!node) return [];

      const pool = node.data;
      const resolved = deepResolve(pool[2], pool);

      let createdCoins = resolved?.profileData?.createdCoins;
      if (!createdCoins) return [];

      return Array.isArray(createdCoins) ? deepResolve(createdCoins, pool) : [];
    } catch (e) {
      console.error("Error fetching coins:", e);
      return [];
    }
  }

  /* ---------------- TABLE UPDATE ---------------- */
  function replaceTable(card, coins) {
    const tbody = card.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    for (const c of coins) {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-muted/50 cursor-pointer transition-colors";

      tr.innerHTML = `
        <td class="pl-6 p-2 font-medium">
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">
              ${c.symbol?.slice(0, 2) ?? "??"}
            </div>
            <span class="max-w-44 truncate">${c.name ?? "Unknown"}</span>
          </div>
        </td>
        <td class="p-2 font-mono">
          $${Number(c.currentPrice ?? 0).toFixed(6)}
        </td>
        <td class="p-2 font-mono hidden sm:table-cell">
          $${Number(c.marketCap ?? 0).toLocaleString()}
        </td>
        <td class="p-2 hidden md:table-cell">
          <span class="${
            (c.change24h ?? 0) >= 0 ? "bg-green-600" : "bg-destructive"
          } text-white rounded-md px-2 py-0.5 text-xs font-medium">
            ${Number(c.change24h ?? 0).toFixed(2)}%
          </span>
        </td>
        <td class="p-2 hidden lg:table-cell text-muted-foreground text-sm">
          ${c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  /* ---------------- BUTTON ---------------- */
  function addButton(card) {
    if (card.querySelector(".show-all-coins")) return;

    const btn = document.createElement("button");
    btn.className =
      "show-all-coins ml-auto rounded-md border px-3 py-1 text-sm font-medium";
    btn.textContent = "Show all coins";

    card.querySelector('[data-slot="card-header"]')?.appendChild(btn);

    btn.onclick = async () => {
      btn.textContent = "Loading…";
      btn.disabled = true;

      const username = location.pathname.match(/\/user\/([^/]+)/)?.[1];
      if (!username) {
        btn.textContent = "Failed to get user";
        return;
      }

      const coins = await getAllCoins(username);
      if (coins.length === 0) {
        btn.textContent = "No coins found";
        return;
      }

      replaceTable(card, coins);
      btn.textContent = "Showing all coins";
    };
  }

  /* ---------------- OBSERVER ---------------- */
  const observer = new MutationObserver(() => {
    const card = [...document.querySelectorAll('[data-slot="card"]')].find(c =>
      c.textContent.includes("Created Coins")
    );
    if (card) addButton(card);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
