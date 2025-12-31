// this script is made using AI
(function() {
    'use strict';

    function getCreator() {
        const creatorHeader = Array.from(document.querySelectorAll('div'))
            .find(d => d.textContent.includes('Created by'));
        if (!creatorHeader) return { name: "Unknown", handle: "@Unknown" };

        const nameNode = creatorHeader.nextElementSibling;
        const handleNode = nameNode ? nameNode.nextElementSibling : null;

        const name = nameNode ? nameNode.textContent.trim() : "Unknown";
        const handle = handleNode ? handleNode.textContent.trim() : "@Unknown";

        return { name, handle };
    }

    function getTopHolders() {
        // top holders are usually in the "Top Holders" section
        const sectionHeader = Array.from(document.querySelectorAll('div'))
            .find(d => d.textContent.includes('Top Holders'));
        if (!sectionHeader) return [];

        const holders = [];
        let current = sectionHeader.nextElementSibling;
        while (current && current.querySelector('div')) {
            const userNameNode = current.querySelector('div:nth-child(1)');
            const percentNode = current.querySelector('div:nth-child(2)');
            if (userNameNode && percentNode) {
                const name = userNameNode.textContent.trim();
                const percentText = percentNode.textContent.trim().replace('%', '');
                const percent = parseFloat(percentText) || 0;
                holders.push({ name, percent });
            }
            current = current.nextElementSibling;
        }

        return holders;
    }

    function calculateRisk(owner, holders) {
        let points = 0;
        let reasons = [];

        // Owner points
        const ownerPercent = holders.find(h => h.name.toLowerCase() === owner.name.toLowerCase())?.percent || 0;
        if (ownerPercent <= 20) { points -= 4; reasons.push(`Owner owns ${ownerPercent}% → -4 pts`); }
        else if (ownerPercent <= 40) { points -= 2; reasons.push(`Owner owns ${ownerPercent}% → -2 pts`); }
        else if (ownerPercent <= 60) { points += 0; reasons.push(`Owner owns ${ownerPercent}% → 0 pts`); }
        else if (ownerPercent <= 80) { points += 5; reasons.push(`Owner owns ${ownerPercent}% → +5 pts`); }
        else { points += 10; reasons.push(`Owner owns ${ownerPercent}% → +10 pts`); }

        // Top holders (skip owner)
        let topCount = 0;
        for (const h of holders) {
            if (h.name.toLowerCase() === owner.name.toLowerCase()) continue;
            topCount++;
            let p = 0;
            if (h.percent <= 20) p = -0.5;
            else if (h.percent <= 40) p = -0.25;
            else if (h.percent <= 60) p = 0;
            else if (h.percent <= 80) p = 0.5;
            else p = 1;
            points += p;
            reasons.push(`Top holder #${topCount} owns ${h.percent}% → ${p >= 0 ? '+' : ''}${p} pts`);
            if (topCount >= 3) break;
        }

        // Check for massive imbalance
        const otherPercent = holders.reduce((sum, h) => {
            if (h.name.toLowerCase() === owner.name.toLowerCase()) return sum;
            return sum + h.percent;
        }, 0);
        if (ownerPercent - otherPercent > 50) {
            // disregard negative points
            reasons = reasons.map(r => r.replace(/→ -[\d\.]+ pts/, '→ 0 pts'));
        }

        const riskLevel = points >= 6 ? 'RISKY' : points >= 2 ? 'LOW RISK' : 'NO RISK';
        return { points, riskLevel, reasons };
    }

    function renderRisk() {
        const owner = getCreator();
        const holders = getTopHolders();

        const risk = calculateRisk(owner, holders);

        const buyButton = document.querySelector('button[data-slot="button"]');
        if (!buyButton) return;

        // remove existing risk container if any
        const existing = document.querySelector('#coin-risk-container');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'coin-risk-container';
        container.style.cssText = `
            margin-bottom: 12px;
            padding: 12px;
            border-radius: 10px;
            background: rgb(15, 15, 20);
            color: rgb(234, 234, 240);
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            border: 1px solid rgb(42, 42, 53);
            user-select: text;
        `;

        container.innerHTML = `
            <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Coin Risk Analysis</div>
            <div style="font-size:13px;opacity:.9;margin-bottom:6px;">
                Creator: ${owner.name} (${owner.handle})
            </div>
            <div style="font-size:13px;margin-bottom:6px;">
                <b>Risk Points:</b> ${risk.points}<br>
                <b>Risk Level:</b> ${risk.riskLevel}
            </div>
            <div style="font-size:12px;opacity:.85;">
                <b>Reasons:</b>
                <ul style="margin:6px 0 0 16px;padding:0;">
                    ${risk.reasons.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `;

        buyButton.parentNode.insertBefore(container, buyButton);
    }

    // wait for page to fully load chart/holders
    const observer = new MutationObserver(() => {
        const buyButton = document.querySelector('button[data-slot="button"]');
        if (buyButton) {
            renderRisk();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
