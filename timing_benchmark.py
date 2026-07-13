import json
import time

from router import route_ticket

# Estimated seconds for a human agent to read, classify, prioritize, and
# route a ticket by hand. Not measured from a real agent -- these are
# assumptions based on typical helpdesk triage times, varied by how much
# reading/judgment each ticket type demands. Documented here so the
# assumption is explicit rather than a fabricated "real" measurement.
MANUAL_SECONDS_BY_EDGE_CASE = {
    "very_short": 60,
    "angry": 200,
    "ambiguous": 240,
    "non_english": 220,
    "long": 300,
    None: 150,
}


def manual_estimate_seconds(edge_case):
    return MANUAL_SECONDS_BY_EDGE_CASE.get(edge_case, MANUAL_SECONDS_BY_EDGE_CASE[None])


def run_benchmark(tickets_path="sample_tickets.json", output_path="timing_report.json"):
    with open(tickets_path) as f:
        tickets = json.load(f)

    rows = []
    total_ai_seconds = 0.0
    total_manual_seconds = 0

    for t in tickets:
        start = time.perf_counter()
        result = route_ticket(t["ticket"])
        elapsed = time.perf_counter() - start

        manual_seconds = manual_estimate_seconds(t["edge_case"])

        total_ai_seconds += elapsed
        total_manual_seconds += manual_seconds

        rows.append({
            "id": t["id"],
            "edge_case": t["edge_case"],
            "ai_seconds": round(elapsed, 3),
            "manual_seconds_estimate": manual_seconds,
            "category": result["category"],
            "priority": result["priority"],
        })

    summary = {
        "ticket_count": len(tickets),
        "total_ai_seconds": round(total_ai_seconds, 2),
        "avg_ai_seconds_per_ticket": round(total_ai_seconds / len(tickets), 2),
        "total_manual_seconds_estimate": total_manual_seconds,
        "avg_manual_seconds_per_ticket": round(total_manual_seconds / len(tickets), 1),
        "speedup_factor": round(total_manual_seconds / total_ai_seconds, 1),
    }

    report = {"summary": summary, "tickets": rows}

    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    report = run_benchmark()
    s = report["summary"]
    print(f"Tickets processed: {s['ticket_count']}")
    print(f"AI total time: {s['total_ai_seconds']}s (avg {s['avg_ai_seconds_per_ticket']}s/ticket)")
    print(
        f"Manual estimated time: {s['total_manual_seconds_estimate']}s "
        f"(avg {s['avg_manual_seconds_per_ticket']}s/ticket, estimate)"
    )
    print(f"AI is ~{s['speedup_factor']}x faster than estimated manual routing")
