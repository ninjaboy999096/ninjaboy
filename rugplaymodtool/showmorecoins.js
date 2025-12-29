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
    if (!res.ok) throw new Error("Failed to fetch user data");

    const json = await res.json();

    const node = json.nodes.find(n => n.type === "data" && n.data[0]?.username);
    if (!node) return [];

    const pool = node.data;

    // Profile node contains createdCoins
    const profileNode = json.nodes.find(
      n => n.type === "data" && n.data[0]?.username === 1
    );
    if (!profileNode) return [];

    const profileData = profileNode.data;
    const createdCoinsIndex = profileData.findIndex(x => x && x.createdCoins !== undefined);
    if (createdCoinsIndex === -1) return [];

    const coins = resolve(profileData[createdCoinsIndex].createdCoins, profileData);
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
              ${c.symbol?.slice(0, 2) ?? ""}
            </div>
            <span class="max-w-44 truncate">${c.name ?? ""}</span>
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
            c.change24h >= 0 ? "bg-green-600" : "bg-destructive"
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

  function addButton(card) {
    if (card.querySelector(".show-all-coins")) return;

    const btn = document.createElement("button");
    btn.className = "show-all-coins ml-auto rounded-md border px-3 py-1 text-sm font-medium";
    btn.textContent = "Show all coins";

    card.querySelector('[data-slot="card-header"]').appendChild(btn);

    btn.onclick = async () => {
      btn.textContent = "Loading…";
      btn.disabled = true;

      const username = location.pathname.match(/\/user\/([^/]+)/)?.[1];
      if (!username) return;

      try {
        const coins = await getAllCoins(username);
        replaceTable(card, coins);
        btn.textContent = "Showing all coins";
      } catch (e) {
        btn.textContent = "Failed to load";
        console.error(e);
      }
    };
  }

  const observer = new MutationObserver(() => {
    const card = [...document.querySelectorAll('[data-slot="card"]')]
      .find(c => c.textContent.includes("Created Coins"));
    if (card) addButton(card);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
