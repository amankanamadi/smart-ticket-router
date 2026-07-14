(function () {
    "use strict";

    const CATEGORIES = ["Billing", "Technical", "Account", "Feature Request", "General Inquiry"];
    const PRIORITIES = ["High", "Medium", "Low"];

    // Display-only ERP relabeling. The real backend values (Billing, Technical, ...)
    // never change -- these maps only affect what text is shown in the UI.
    const CATEGORY_LABELS = {
        "Billing": "Finance (AR/AP)",
        "Technical": "IT Support",
        "Account": "Identity & Access",
        "Feature Request": "Product Enhancement",
        "General Inquiry": "Customer Service"
    };

    const TEAM_LABELS = {
        "Billing Team": "Finance Operations",
        "Technical Support": "IT Operations",
        "Account Team": "Identity Management",
        "Product Team": "Product Engineering",
        "Customer Support": "Shared Services"
    };

    function moduleLabel(category) {
        return CATEGORY_LABELS[category] || category;
    }

    function teamLabel(team) {
        return TEAM_LABELS[team] || team;
    }

    const SAMPLE_TICKETS = [
        ["Invoice payment failed", "A supplier invoice payment failed twice this week and the vendor is now escalating for payment confirmation."],
        ["Supplier invoice mismatch", "The supplier invoice amount does not match the purchase order, there's a discrepancy of $340."],
        ["Employee cannot login", "An employee is unable to log into the system despite using the correct credentials; account may be locked."],
        ["Purchase order approval failed", "A purchase order submitted for approval is stuck and was never routed to the approving manager."],
        ["Inventory synchronization error", "Inventory counts between the warehouse module and the ERP system are out of sync after last night's batch job."],
        ["Payroll processing issue", "This month's payroll run failed partway through and several employees were not paid on schedule."],
        ["Expense claim rejected", "An employee's expense claim was rejected without an explanation and they are requesting a review."],
        ["System timeout", "The ERP system times out repeatedly when generating the quarterly financial report."],
        ["ERP dashboard not loading", "The ERP dashboard has been stuck on a loading spinner for the past hour and won't render any data."],
        ["Bank reconciliation failed", "The automated bank reconciliation job failed overnight and finance cannot close the books for the month."]
    ];

    const state = {
        history: [],
        lastResult: null,
        responseTimes: [],
        nextId: 1,
        sampleTickets: [],
        historySortKey: "newest",
        expandedHistoryIds: new Set()
    };

    const el = (id) => document.getElementById(id);

    // ---------- Theme ----------
    function initTheme() {
        const saved = localStorage.getItem("str-theme");
        if (saved === "dark" || saved === "light") {
            document.documentElement.setAttribute("data-theme", saved);
        }
        syncThemeIcons();
    }

    function syncThemeIcons() {
        const isDark = getEffectiveTheme() === "dark";
        el("themeIconSun").style.display = isDark ? "none" : "block";
        el("themeIconMoon").style.display = isDark ? "block" : "none";
    }

    function getEffectiveTheme() {
        const attr = document.documentElement.getAttribute("data-theme");
        if (attr) return attr;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function toggleTheme() {
        const next = getEffectiveTheme() === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("str-theme", next);
        syncThemeIcons();
    }

    // ---------- Toasts ----------
    function showToast(message, type) {
        const container = el("toastContainer");
        const toast = document.createElement("div");
        toast.className = "toast toast-" + (type || "success");
        toast.innerHTML = "<span></span><button class=\"toast-close\" aria-label=\"Dismiss\">&times;</button>";
        toast.querySelector("span").textContent = message;
        toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // ---------- Collapsible panels ----------
    function initCollapsibles() {
        document.querySelectorAll(".card-header--collapsible").forEach((header) => {
            const targetId = header.getAttribute("data-collapse-target");
            const body = el(targetId);
            header.setAttribute("aria-expanded", body.classList.contains("collapsed") ? "false" : "true");
            header.addEventListener("click", (e) => {
                if (e.target.closest("button") && !e.target.closest(".chevron-btn")) return;
                const collapsed = body.classList.toggle("collapsed");
                header.setAttribute("aria-expanded", collapsed ? "false" : "true");
            });
        });
    }

    // ---------- Sidebar navigation (UI only, anchor-scroll within the same page) ----------
    function initSidebarNav() {
        const items = document.querySelectorAll(".erp-nav-item");
        items.forEach((item) => {
            item.addEventListener("click", (e) => {
                const targetId = item.getAttribute("data-nav-target");
                if (!targetId) {
                    e.preventDefault();
                    showToast(item.textContent.trim() + " is a UI placeholder in this demo.", "warning");
                    return;
                }
                const target = document.getElementById(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                items.forEach((i) => i.classList.remove("erp-nav-item--active"));
                item.classList.add("erp-nav-item--active");
            });
        });
    }

    // ---------- Live clock (UI only) ----------
    function tickClock() {
        const now = new Date();
        el("erpDateTime").textContent = now.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "medium"
        });
    }

    // ---------- Sample tickets ----------
    function renderSampleButtons() {
        const wrap = el("sampleButtons");
        SAMPLE_TICKETS.forEach(([label, text]) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip-btn";
            btn.textContent = label;
            btn.title = text;
            btn.addEventListener("click", () => {
                el("ticketInput").value = text;
                updateCharCount();
                el("ticketInput").focus();
            });
            wrap.appendChild(btn);
        });
    }

    // ---------- Char counter ----------
    function updateCharCount() {
        const len = el("ticketInput").value.length;
        el("charCounter").textContent = len + " / 5000";
    }

    // ---------- Badges ----------
    function priorityBadgeClass(priority) {
        if (priority === "High") return "badge-priority--high";
        if (priority === "Medium") return "badge-priority--medium";
        return "badge-priority--low";
    }

    function emotionBadgeClass(tone) {
        if (tone === "Angry") return "badge-tone--angry";
        if (tone === "Frustrated") return "badge-tone--frustrated";
        if (tone === "Confused") return "badge-tone--confused";
        return "badge-tone--neutral";
    }

    function classifyResultTone(result) {
        if (result.category === "Unknown") {
            if ((result.reasoning || "").includes("AI service unavailable")) return "warning";
            return "error";
        }
        return "ok";
    }

    function statusBadgeInfo(result) {
        const tone = classifyResultTone(result);
        if (tone === "warning") return { label: "Manual Review Needed", cls: "badge-status--warning" };
        if (tone === "error") return { label: "Fallback Applied", cls: "badge-status--error" };
        return { label: "Routed", cls: "badge-status--ok" };
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------- Result rendering ----------
    function renderResult(result) {
        const card = el("resultCard");
        const tone = classifyResultTone(result);
        card.classList.remove("result-card--warning", "result-card--error");
        if (tone === "warning") card.classList.add("result-card--warning");
        if (tone === "error") card.classList.add("result-card--error");

        const status = statusBadgeInfo(result);

        el("resultHeaderStatus").innerHTML =
            '<span class="badge ' + status.cls + '">' + status.label + "</span>";

        el("resultBody").innerHTML =
            '<div class="result-grid">' +
            '<span class="badge badge-category">' + escapeHtml(moduleLabel(result.category)) + "</span>" +
            '<span class="badge ' + priorityBadgeClass(result.priority) + '">' + escapeHtml(result.priority) + " Severity</span>" +
            '<span class="badge badge-team">' + escapeHtml(teamLabel(result.assigned_team)) + "</span>" +
            '<span class="badge ' + emotionBadgeClass(result.tone) + '">' + escapeHtml(result.tone) + " Tone</span>" +
            "</div>" +
            '<p class="result-reasoning"><strong>AI Analysis:</strong> ' + escapeHtml(result.reasoning) + "</p>";

        el("moduleBadgePreview").textContent = "Module: " + moduleLabel(result.category);
        el("severityBadgePreview").textContent = "Severity: " + result.priority;
        el("severityBadgePreview").className = "badge " + priorityBadgeClass(result.priority);
    }

    function renderJsonViewer(result) {
        el("jsonViewer").textContent = JSON.stringify(result, null, 2);
    }

    // ---------- KPI row ----------
    function renderKPIRow() {
        const total = state.history.length;
        const counts = {};
        CATEGORIES.forEach((c) => (counts[c] = 0));
        const pCounts = { High: 0, Medium: 0, Low: 0 };
        let critical = 0;

        state.history.forEach((h) => {
            if (counts[h.category] !== undefined) counts[h.category]++;
            if (pCounts[h.priority] !== undefined) pCounts[h.priority]++;
            if (h.priority === "High" && h.tone === "Angry") critical++;
        });

        const avgMs = state.responseTimes.length
            ? state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length
            : null;

        const kpis = [
            ["Total Incidents", total, "kpi--total"],
            ["Critical Incidents", critical, "kpi--critical"],
            ["High Priority", pCounts.High, "kpi--high"],
            ["Finance Incidents", counts["Billing"], "kpi--finance"],
            ["IT Incidents", counts["Technical"], "kpi--it"],
            ["Account Incidents", counts["Account"], "kpi--account"],
            ["Feature Requests", counts["Feature Request"], "kpi--feature"],
            ["Avg AI Response", avgMs === null ? "-" : avgMs.toFixed(0) + " ms", "kpi--speed"]
        ];

        el("kpiRow").innerHTML = kpis
            .map(
                ([label, value, cls]) =>
                    '<div class="kpi-card ' + cls + '">' +
                    '<div class="kpi-card-value">' + value + "</div>" +
                    '<div class="kpi-card-label">' + label + "</div>" +
                    "</div>"
            )
            .join("");
    }

    // ---------- Service analytics: severity bars + module donut + trend cards ----------
    function renderSeverityBars() {
        const total = state.history.length;
        const pCounts = { High: 0, Medium: 0, Low: 0 };
        state.history.forEach((h) => {
            if (pCounts[h.priority] !== undefined) pCounts[h.priority]++;
        });

        const rows = [
            ["High", pCounts.High, "bar--high"],
            ["Medium", pCounts.Medium, "bar--medium"],
            ["Low", pCounts.Low, "bar--low"]
        ];

        el("severityBars").innerHTML = rows
            .map(([label, count, cls]) => {
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                    '<div class="progress-row">' +
                    '<span class="progress-label">' + label + "</span>" +
                    '<div class="progress-track"><div class="progress-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
                    '<span class="progress-value">' + count + " (" + pct + "%)</span>" +
                    "</div>"
                );
            })
            .join("");
    }

    const DONUT_COLORS = ["#0a5cd8", "#0891b2", "#7c3aed", "#d97706", "#64748b"];

    function renderModuleDonut() {
        const total = state.history.length;
        const counts = {};
        CATEGORIES.forEach((c) => (counts[c] = 0));
        state.history.forEach((h) => {
            if (counts[h.category] !== undefined) counts[h.category]++;
        });

        if (!total) {
            el("moduleDonut").style.background = "var(--color-bg)";
            el("moduleDonutLegend").innerHTML = '<p class="empty-state-sub">No incidents processed yet.</p>';
            return;
        }

        let cursor = 0;
        const segments = CATEGORIES.map((cat, i) => {
            const pct = (counts[cat] / total) * 100;
            const start = cursor;
            cursor += pct;
            return DONUT_COLORS[i] + " " + start + "% " + cursor + "%";
        });

        el("moduleDonut").style.background = "conic-gradient(" + segments.join(", ") + ")";

        el("moduleDonutLegend").innerHTML = CATEGORIES.map((cat, i) => {
            const pct = total ? Math.round((counts[cat] / total) * 100) : 0;
            return (
                '<div class="donut-legend-row">' +
                '<span class="donut-legend-swatch" style="background:' + DONUT_COLORS[i] + '"></span>' +
                '<span class="donut-legend-label">' + escapeHtml(moduleLabel(cat)) + "</span>" +
                '<span class="donut-legend-value">' + counts[cat] + " (" + pct + "%)</span>" +
                "</div>"
            );
        }).join("");
    }

    function renderTrendCards() {
        const total = state.history.length;
        const resolved = state.history.filter((h) => h.category !== "Unknown").length;
        const avgMs = state.responseTimes.length
            ? state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length
            : null;

        const cards = [
            ["Incidents This Session", total],
            ["Successfully Classified", resolved],
            ["Avg Response Time", avgMs === null ? "-" : avgMs.toFixed(0) + " ms"]
        ];

        el("trendCards").innerHTML = cards
            .map(
                ([label, value]) =>
                    '<div class="trend-card">' +
                    '<div class="trend-card-value">' + value + "</div>" +
                    '<div class="trend-card-label">' + label + "</div>" +
                    "</div>"
            )
            .join("");
    }

    function renderServiceAnalytics() {
        renderSeverityBars();
        renderModuleDonut();
        renderTrendCards();
    }

    // ---------- Department buckets ----------
    function renderBuckets() {
        const grid = el("bucketsGrid");
        grid.innerHTML = CATEGORIES.map((category) => {
            const items = state.history.filter((h) => h.category === category);
            const list = items.length
                ? items
                      .map((h) => "<li>" + escapeHtml(truncate(h.ticket, 70)) + "</li>")
                      .join("")
                : '<p class="bucket-empty">No incidents yet.</p>';

            return (
                '<div class="bucket-card"><h3>' +
                escapeHtml(moduleLabel(category)) +
                '</h3><p class="bucket-count">' +
                items.length +
                " incident" + (items.length === 1 ? "" : "s") +
                '</p><ul class="bucket-list">' +
                (items.length ? list : "") +
                "</ul>" +
                (items.length ? "" : list) +
                "</div>"
            );
        }).join("");
    }

    function truncate(text, max) {
        return text.length > max ? text.slice(0, max) + "…" : text;
    }

    // ---------- Incident history (ERP table) ----------
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }

    function sortedHistory(items) {
        const arr = items.slice();
        if (state.historySortKey === "oldest") {
            arr.sort((a, b) => a.time - b.time);
        } else if (state.historySortKey === "severity") {
            const rank = { High: 0, Medium: 1, Low: 2 };
            arr.sort((a, b) => rank[a.priority] - rank[b.priority]);
        } else if (state.historySortKey === "module") {
            arr.sort((a, b) => moduleLabel(a.category).localeCompare(moduleLabel(b.category)));
        } else {
            arr.sort((a, b) => b.time - a.time);
        }
        return arr;
    }

    function renderHistory() {
        const search = el("historySearch").value.trim().toLowerCase();
        const categoryFilter = el("categoryFilter").value;
        const priorityFilter = el("priorityFilter").value;

        const filtered = state.history.filter((h) => {
            if (search && !h.ticket.toLowerCase().includes(search)) return false;
            if (categoryFilter && h.category !== categoryFilter) return false;
            if (priorityFilter && h.priority !== priorityFilter) return false;
            return true;
        });

        if (!filtered.length) {
            el("historyList").innerHTML = '<div class="empty-state"><p>No matching incidents.</p></div>';
            return;
        }

        const rows = sortedHistory(filtered)
            .map((h) => {
                const expanded = state.expandedHistoryIds.has(h.id);
                return (
                    '<tr class="erp-table-row" data-history-id="' + h.id + '">' +
                    '<td>' + escapeHtml(truncate(h.ticket, 60)) + "</td>" +
                    '<td><span class="badge badge-category">' + escapeHtml(moduleLabel(h.category)) + "</span></td>" +
                    '<td><span class="badge ' + priorityBadgeClass(h.priority) + '">' + escapeHtml(h.priority) + "</span></td>" +
                    '<td>' + escapeHtml(teamLabel(h.assigned_team)) + "</td>" +
                    '<td><span class="badge ' + emotionBadgeClass(h.tone) + '">' + escapeHtml(h.tone) + "</span></td>" +
                    '<td class="erp-table-time">' + formatTime(h.time) + "</td>" +
                    '<td><button type="button" class="btn btn-ghost btn-sm erp-expand-btn" data-history-id="' + h.id + '">' +
                    (expanded ? "Collapse" : "Expand") +
                    "</button></td>" +
                    "</tr>" +
                    '<tr class="erp-table-detail-row' + (expanded ? "" : " collapsed") + '" data-history-detail="' + h.id + '">' +
                    '<td colspan="7"><div class="erp-table-detail">' +
                    "<p><strong>Full Incident Description:</strong> " + escapeHtml(h.ticket) + "</p>" +
                    "<p><strong>AI Analysis:</strong> " + escapeHtml(h.reasoning) + "</p>" +
                    "</div></td>" +
                    "</tr>"
                );
            })
            .join("");

        el("historyList").innerHTML =
            '<div class="erp-table-wrapper"><table class="erp-table">' +
            "<thead><tr>" +
            "<th>Incident</th><th>Module</th><th>Severity</th><th>Functional Team</th><th>Tone</th><th>Time</th><th></th>" +
            "</tr></thead>" +
            "<tbody>" + rows + "</tbody>" +
            "</table></div>";
    }

    function renderAll() {
        renderKPIRow();
        renderServiceAnalytics();
        renderBuckets();
        renderHistory();
    }

    function addToHistory(ticketText, result) {
        state.history.push({
            id: state.nextId++,
            ticket: ticketText,
            category: result.category,
            priority: result.priority,
            assigned_team: result.assigned_team,
            reasoning: result.reasoning,
            tone: result.tone,
            time: new Date()
        });
        renderAll();
    }

    function resetHistoryAndAnalytics() {
        state.history = [];
        state.expandedHistoryIds.clear();
        renderAll();
    }

    // ---------- AI/API status + timing ----------
    function setApiStatus(ok) {
        const pill = el("apiStatusPill");
        pill.innerHTML =
            '<span class="status-dot ' + (ok ? "status-dot--ok" : "status-dot--bad") + '"></span> ' +
            (ok ? "API Connected" : "API Unreachable");
    }

    function recordResponseTime(ms) {
        state.responseTimes.push(ms);
        const avg = state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length;
        el("avgResponseTime").textContent = avg.toFixed(0) + " ms";
        el("lastRoutedTime").textContent = formatTime(new Date());
    }

    // ---------- Inline error ----------
    function showInlineError(message) {
        const box = el("inlineError");
        if (!message) {
            box.style.display = "none";
            box.textContent = "";
            return;
        }
        box.textContent = message;
        box.style.display = "block";
    }

    // ---------- Submission ----------
    async function submitTicket(ticketText) {
        showInlineError(null);

        if (!ticketText.trim()) {
            showInlineError("Please enter an incident description before submitting.");
            showToast("Please enter an incident description before submitting.", "error");
            return;
        }

        if (ticketText.length > 5000) {
            showInlineError("Incident description is too long. Please shorten it to 5000 characters or fewer.");
            showToast("Incident description is too long.", "error");
            return;
        }

        setLoading(true);
        const started = performance.now();

        try {
            const response = await fetch("/api/route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticket: ticketText })
            });

            const elapsed = performance.now() - started;

            let payload;
            try {
                payload = await response.json();
            } catch (parseErr) {
                setApiStatus(false);
                showToast("Received an unexpected response from the server.", "error");
                return;
            }

            if (!response.ok) {
                setApiStatus(response.status < 500);
                showInlineError(payload.error || "Something went wrong.");
                showToast(payload.error || "Something went wrong.", "error");
                return;
            }

            setApiStatus(true);
            recordResponseTime(elapsed);

            state.lastResult = payload;
            renderResult(payload);
            renderJsonViewer(payload);
            addToHistory(ticketText, payload);

            const tone = classifyResultTone(payload);
            if (tone === "warning") {
                showToast("Incident routed, but the AI service reported an issue.", "warning");
            } else if (tone === "error") {
                showToast("Incident routed, but the AI response was invalid — used a fallback.", "warning");
            } else {
                showToast("Incident analyzed and routed successfully.", "success");
            }
        } catch (networkErr) {
            setApiStatus(false);
            showInlineError("Network failure — please check your connection and try again.");
            showToast("Network failure — please check your connection.", "error");
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        el("routeBtn").disabled = isLoading;
        el("routeBtnLabel").style.display = isLoading ? "none" : "inline";
        el("routeBtnSpinner").style.display = isLoading ? "inline-block" : "none";
    }

    // ---------- Copy / Download JSON ----------
    function copyJson() {
        if (!state.lastResult) {
            showToast("No result to copy yet.", "error");
            return;
        }
        navigator.clipboard
            .writeText(JSON.stringify(state.lastResult, null, 2))
            .then(() => showToast("Copied JSON to clipboard.", "success"))
            .catch(() => showToast("Could not copy to clipboard.", "error"));
    }

    function downloadJson() {
        if (!state.lastResult) {
            showToast("No result to download yet.", "error");
            return;
        }
        const blob = new Blob([JSON.stringify(state.lastResult, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "incident-classification.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---------- Sample ERP incident library (full 35-ticket dataset) ----------
    function edgeCaseLabel(edgeCase) {
        if (!edgeCase) return "normal";
        return edgeCase.replace("_", " ");
    }

    function renderSampleLibrary() {
        const search = el("sampleLibrarySearch").value.trim().toLowerCase();
        const edgeCaseFilter = el("sampleLibraryEdgeCaseFilter").value;

        const filtered = state.sampleTickets.filter((t) => {
            if (search && !t.ticket.toLowerCase().includes(search)) return false;
            if (edgeCaseFilter && t.edge_case !== edgeCaseFilter) return false;
            return true;
        });

        if (!filtered.length) {
            el("sampleLibraryList").innerHTML = '<div class="empty-state"><p>No matching sample incidents.</p></div>';
            return;
        }

        el("sampleLibraryList").innerHTML = filtered
            .map(
                (t) =>
                    '<div class="history-item">' +
                    '<span class="badge badge-team">' + escapeHtml(edgeCaseLabel(t.edge_case)) + "</span>" +
                    '<span class="history-item-ticket">' + escapeHtml(t.ticket) + "</span>" +
                    '<button type="button" class="btn btn-ghost btn-sm sample-insert-btn" data-id="' +
                    t.id +
                    '">Insert</button>' +
                    "</div>"
            )
            .join("");
    }

    function insertSampleTicket(id) {
        const ticket = state.sampleTickets.find((t) => t.id === id);
        if (!ticket) return;
        el("ticketInput").value = ticket.ticket;
        updateCharCount();
        el("ticketInput").focus();
        showToast("Sample incident inserted.", "success");
    }

    async function loadSampleTicketLibrary() {
        try {
            const response = await fetch("/api/sample-tickets");
            const payload = await response.json();
            if (!response.ok) {
                el("sampleLibraryList").innerHTML = '<div class="empty-state"><p>Could not load sample incidents.</p></div>';
                return;
            }
            state.sampleTickets = payload;
            renderSampleLibrary();
        } catch (e) {
            el("sampleLibraryList").innerHTML = '<div class="empty-state"><p>Could not load sample incidents.</p></div>';
        }
    }

    // ---------- Manual vs AI benchmark ----------
    function statTile(value, label) {
        return (
            '<div class="stat-tile"><div class="stat-tile-value">' +
            value +
            '</div><div class="stat-tile-label">' +
            label +
            "</div></div>"
        );
    }

    function benchmarkBarRow(label, pct, valueText, kind) {
        return (
            '<div class="benchmark-bar-row">' +
            '<span class="benchmark-bar-label">' + label + "</span>" +
            '<div class="benchmark-bar-track"><div class="benchmark-bar benchmark-bar--' +
            kind +
            '" style="width:' + pct + '%"></div></div>' +
            '<span class="benchmark-bar-value">' + valueText + "</span>" +
            "</div>"
        );
    }

    function renderBenchmark(summary) {
        const manualAvg = summary.avg_manual_seconds_per_ticket;
        const aiAvg = summary.avg_ai_seconds_per_ticket;
        const aiPct = Math.max(2, Math.min(100, (aiAvg / manualAvg) * 100));

        el("benchmarkResult").innerHTML =
            '<div class="stat-grid benchmark-stats">' +
            statTile(summary.ticket_count, "Incidents") +
            statTile(summary.total_ai_seconds + "s", "Total AI Time") +
            statTile(summary.total_manual_seconds_estimate + "s", "Total Manual (est.)") +
            statTile(summary.speedup_factor + "x", "Speedup") +
            "</div>" +
            '<div class="benchmark-bars">' +
            benchmarkBarRow("Manual (est.)", 100, manualAvg.toFixed(1) + "s/ticket", "manual") +
            benchmarkBarRow("AI (measured)", aiPct, aiAvg.toFixed(2) + "s/ticket", "ai") +
            "</div>";
    }

    function setBenchmarkLoading(isLoading) {
        el("runBenchmarkBtn").disabled = isLoading;
        el("benchmarkBtnLabel").textContent = isLoading
            ? "Running (~1 min)..."
            : "Run Benchmark (35 tickets)";
        el("benchmarkBtnSpinner").style.display = isLoading ? "inline-block" : "none";
    }

    async function runBenchmark() {
        setBenchmarkLoading(true);
        try {
            const response = await fetch("/api/benchmark", { method: "POST" });

            let payload;
            try {
                payload = await response.json();
            } catch (parseErr) {
                showToast("Received an unexpected response from the server.", "error");
                return;
            }

            if (!response.ok) {
                showToast(payload.error || "Benchmark failed to run.", "error");
                return;
            }

            renderBenchmark(payload);
            showToast("Benchmark complete: " + payload.speedup_factor + "x faster than manual.", "success");
        } catch (networkErr) {
            showToast("Network failure while running the benchmark.", "error");
        } finally {
            setBenchmarkLoading(false);
        }
    }

    // ---------- Initial server-rendered result (no-JS fallback integration) ----------
    function hydrateInitialState() {
        try {
            const result = JSON.parse(el("initial-result").textContent);
            const ticket = JSON.parse(el("initial-ticket").textContent);
            const error = JSON.parse(el("initial-error").textContent);

            if (error) {
                showInlineError(error);
            }
            if (result) {
                state.lastResult = result;
                renderResult(result);
                renderJsonViewer(result);
                addToHistory(ticket || "", result);
            }
        } catch (e) {
            /* no initial state to hydrate */
        }
    }

    // ---------- Wire up ----------
    function init() {
        initTheme();
        renderSampleButtons();
        initCollapsibles();
        initSidebarNav();
        updateCharCount();
        renderAll();
        tickClock();
        setInterval(tickClock, 1000);

        el("themeToggle").addEventListener("click", toggleTheme);
        el("ticketInput").addEventListener("input", updateCharCount);
        el("clearBtn").addEventListener("click", () => {
            el("ticketInput").value = "";
            updateCharCount();
            showInlineError(null);
        });

        el("ticketForm").addEventListener("submit", (e) => {
            e.preventDefault();
            submitTicket(el("ticketInput").value);
        });

        el("copyJsonBtn").addEventListener("click", copyJson);
        el("downloadJsonBtn").addEventListener("click", downloadJson);
        el("clearHistoryBtn").addEventListener("click", resetHistoryAndAnalytics);
        el("resetAnalyticsBtn").addEventListener("click", resetHistoryAndAnalytics);
        el("runBenchmarkBtn").addEventListener("click", runBenchmark);

        el("historySearch").addEventListener("input", renderHistory);
        el("categoryFilter").addEventListener("change", renderHistory);
        el("priorityFilter").addEventListener("change", renderHistory);
        el("historySortSelect").addEventListener("change", (e) => {
            state.historySortKey = e.target.value;
            renderHistory();
        });
        el("historyList").addEventListener("click", (e) => {
            const btn = e.target.closest(".erp-expand-btn");
            if (!btn) return;
            const id = Number(btn.getAttribute("data-history-id"));
            if (state.expandedHistoryIds.has(id)) {
                state.expandedHistoryIds.delete(id);
            } else {
                state.expandedHistoryIds.add(id);
            }
            renderHistory();
        });

        el("sampleLibrarySearch").addEventListener("input", renderSampleLibrary);
        el("sampleLibraryEdgeCaseFilter").addEventListener("change", renderSampleLibrary);
        el("sampleLibraryList").addEventListener("click", (e) => {
            const btn = e.target.closest(".sample-insert-btn");
            if (!btn) return;
            insertSampleTicket(Number(btn.getAttribute("data-id")));
        });
        loadSampleTicketLibrary();

        hydrateInitialState();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
