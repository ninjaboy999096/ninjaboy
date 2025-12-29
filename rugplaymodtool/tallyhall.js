(() => {
  function resolve(v, pool) {
    if (typeof v === "number") return resolve(pool[v], pool);
    if (Array.isArray(v)) return v.map(x => resolve(x, pool));
    if (v && typeof v === "object") {
      const o = {};
      for (const k in v) o[k] = resolve(v[k], pool);
      return o;
    }
    return v;
  }

  async function getAllCoins(username) {
    const res = await fetch(`https://rugplay.com/user/${username}/__data.json`);
    const json = await res.json();

    // Find the node containing coins
    const node = json.nodes.find(
      n => n.type === "data" && n.data.some(d => typeof d === "number" || (d && d.createdCoins))
    );
    if (!node) return [];

    const pool = node.data;
    const coinsIndex = pool.findIndex(v => typeof v === "object" && v.createdCoins != null);

    if (coinsIndex === -1) return [];

    // Resolve the coins array fully
    const coinsNode = resolve(pool[coinsIndex], pool);

    // In your JSON, createdCoins is just a number, but the actual coins are the array at some nested index
    const coins = coinsNode?.createdCoinsArray || coinsNode?.coins || [];

    // If still empty, fallback to resolving all arrays of objects with 'coinName'
    if (!coins.length) {
      const resolved = pool.map(v => resolve(v, pool));
      return resolved.filter(c => c && c.coinName);
    }

    return coins;
  }

  function replaceTable(card, coins) {
    const tbody = card.querySelector("tbody");
    tbody.innerHTML = "";

    for (const c of coins) {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-muted/50 cursor-pointer transition-colors";

      tr.innerHTML = `
        <td class="pl-6 p-2 font-medium">
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">
              ${c.symbol.slice(0, 2)}
            </div>
            <span class="max-w-44 truncate">${c.name}</span>
          </div>
        </td>
        <td class="p-2 font-mono">
          $${Number(c.currentPrice).toFixed(6)}
        </td>
        <td class="p-2 font-mono hidden sm:table-cell">
          $${Number(c.marketCap).toLocaleString()}
        </td>
        <td class="p-2 hidden md:table-cell">
          <span class="${
            c.change24h >= 0 ? "bg-green-600" : "bg-destructive"
          } text-white rounded-md px-2 py-0.5 text-xs font-medium">
            ${Number(c.change24h).toFixed(2)}%
          </span>
        </td>
        <td class="p-2 hidden lg:table-cell text-muted-foreground text-sm">
          ${new Date(c.createdAt).toLocaleString()}
        </td>
      `;

      tbody.appendChild(tr);
    }
  }

  function addButton(card) {
    if (card.querySelector(".show-all-coins")) return;

    const btn = document.createElement("button");
    btn.className =
      "show-all-coins ml-auto rounded-md border px-3 py-1 text-sm font-medium";
    btn.textContent = "Show all coins";

    card.querySelector('[data-slot="card-header"]').appendChild(btn);

    btn.onclick = async () => {
      btn.textContent = "Loading…";
      btn.disabled = true;

      const username = location.pathname.match(/\/user\/([^/]+)/)?.[1];
      if (!username) return;

      const coins = await getAllCoins(username);
      replaceTable(card, coins);

      btn.textContent = "Showing all coins";
    };
  }

  const observer = new MutationObserver(() => {
    const card = [...document.querySelectorAll('[data-slot="card"]')].find(c =>
      c.textContent.includes("Created Coins")
    );
    if (card) addButton(card);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
