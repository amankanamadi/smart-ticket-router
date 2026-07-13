(function () {
    "use strict";

    const CATEGORIES = ["Billing", "Technical", "Account", "Feature Request", "General Inquiry"];
    const PRIORITIES = ["High", "Medium", "Low"];

    const SAMPLE_TICKETS = [
        ["Payment failed", "My payment failed twice this week and I still can't complete my subscription renewal."],
        ["Forgot password", "I forgot my password and the reset email never arrived."],
        ["App crashes", "The app crashes every time I open the settings page."],
        ["Add dark mode", "Could you please add a dark mode option to the app?"],
        ["Account locked", "My account got locked after too many login attempts, please help me regain access."],
        ["Invoice missing", "I never received my invoice for last month's payment."],
        ["Refund request", "I'd like to request a refund for my last order, it arrived damaged."],
        ["Error 500", "I keep getting a 500 error when trying to submit the form."],
        ["Website slow", "The website has been extremely slow to load for the past few days."],
        ["Login failed", "I can't log in even though I'm using the correct email and password."]
    ];

    const state = {
        history: [],
        lastResult: null,
        responseTimes: [],
        nextId: 1,
        sampleTickets: []
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

    // ---------- Result rendering ----------
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

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function renderResult(result) {
        const card = el("resultCard");
        const tone = classifyResultTone(result);
        card.classList.remove("result-card--warning", "result-card--error");
        if (tone === "warning") card.classList.add("result-card--warning");
        if (tone === "error") card.classList.add("result-card--error");

        el("resultBody").innerHTML =
            '<div class="result-grid">' +
            '<span class="badge badge-category">' + escapeHtml(result.category) + "</span>" +
            '<span class="badge ' + priorityBadgeClass(result.priority) + '">' + escapeHtml(result.priority) + " Priority</span>" +
            '<span class="badge badge-team">' + escapeHtml(result.assigned_team) + "</span>" +
            '<span class="badge ' + emotionBadgeClass(result.tone) + '">' + escapeHtml(result.tone) + " Tone</span>" +
            "</div>" +
            '<p class="result-reasoning">' + escapeHtml(result.reasoning) + "</p>";
    }

    function renderJsonViewer(result) {
        el("jsonViewer").textContent = JSON.stringify(result, null, 2);
    }

    // ---------- Analytics ----------
    function renderAnalytics() {
        const total = state.history.length;
        const counts = {};
        CATEGORIES.forEach((c) => (counts[c] = 0));
        const pCounts = { High: 0, Medium: 0, Low: 0 };

        state.history.forEach((h) => {
            if (counts[h.category] !== undefined) counts[h.category]++;
            if (pCounts[h.priority] !== undefined) pCounts[h.priority]++;
        });

        const tiles = [
            ["Total Processed", total],
            ["Billing", counts["Billing"]],
            ["Technical", counts["Technical"]],
            ["Account", counts["Account"]],
            ["Feature Request", counts["Feature Request"]],
            ["General Inquiry", counts["General Inquiry"]],
            ["High Priority", pCounts.High],
            ["Medium Priority", pCounts.Medium],
            ["Low Priority", pCounts.Low]
        ];

        el("statGrid").innerHTML = tiles
            .map(
                ([label, value]) =>
                    '<div class="stat-tile"><div class="stat-tile-value">' +
                    value +
                    '</div><div class="stat-tile-label">' +
                    label +
                    "</div></div>"
            )
            .join("");
    }

    // ---------- Buckets ----------
    function renderBuckets() {
        const grid = el("bucketsGrid");
        grid.innerHTML = CATEGORIES.map((category) => {
            const items = state.history.filter((h) => h.category === category);
            const list = items.length
                ? items
                      .map((h) => "<li>" + escapeHtml(truncate(h.ticket, 70)) + "</li>")
                      .join("")
                : '<p class="bucket-empty">No tickets yet.</p>';

            return (
                '<div class="bucket-card"><h3>' +
                category +
                '</h3><p class="bucket-count">' +
                items.length +
                " ticket" + (items.length === 1 ? "" : "s") +
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

    // ---------- History ----------
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
            el("historyList").innerHTML = '<div class="empty-state"><p>No matching history.</p></div>';
            return;
        }

        el("historyList").innerHTML = filtered
            .slice()
            .reverse()
            .map(
                (h) =>
                    '<div class="history-item">' +
                    '<span class="badge badge-category">' + escapeHtml(h.category) + "</span>" +
                    '<span class="badge ' + priorityBadgeClass(h.priority) + '">' + escapeHtml(h.priority) + "</span>" +
                    '<span class="badge badge-team">' + escapeHtml(h.assigned_team) + "</span>" +
                    '<span class="badge ' + emotionBadgeClass(h.tone) + '">' + escapeHtml(h.tone) + "</span>" +
                    '<span class="history-item-ticket">' + escapeHtml(truncate(h.ticket, 90)) + "</span>" +
                    '<span class="history-item-time">' + formatTime(h.time) + "</span>" +
                    "</div>"
            )
            .join("");
    }

    function renderAll() {
        renderAnalytics();
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
            showInlineError("Please enter a ticket before submitting.");
            showToast("Please enter a ticket before submitting.", "error");
            return;
        }

        if (ticketText.length > 5000) {
            showInlineError("Ticket is too long. Please shorten it to 5000 characters or fewer.");
            showToast("Ticket is too long.", "error");
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
                showToast("Ticket routed, but the AI service reported an issue.", "warning");
            } else if (tone === "error") {
                showToast("Ticket routed, but the AI response was invalid — used a fallback.", "warning");
            } else {
                showToast("Ticket routed successfully.", "success");
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
        a.download = "routing-result.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---------- Sample ticket library (full 35-ticket dataset) ----------
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
            el("sampleLibraryList").innerHTML = '<div class="empty-state"><p>No matching sample tickets.</p></div>';
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
        showToast("Sample ticket inserted.", "success");
    }

    async function loadSampleTicketLibrary() {
        try {
            const response = await fetch("/api/sample-tickets");
            const payload = await response.json();
            if (!response.ok) {
                el("sampleLibraryList").innerHTML = '<div class="empty-state"><p>Could not load sample tickets.</p></div>';
                return;
            }
            state.sampleTickets = payload;
            renderSampleLibrary();
        } catch (e) {
            el("sampleLibraryList").innerHTML = '<div class="empty-state"><p>Could not load sample tickets.</p></div>';
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
            statTile(summary.ticket_count, "Tickets") +
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
        updateCharCount();
        renderAll();

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
