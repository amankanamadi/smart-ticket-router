import json
import os

from flask import Flask, render_template, request, jsonify
from router import route_ticket
from timing_benchmark import run_benchmark

app = Flask(__name__)

MAX_TICKET_LENGTH = 5000
SAMPLE_TICKETS_PATH = "sample_tickets.json"

@app.route("/", methods=["GET", "POST"])
def home():

    ai_configured = bool(os.getenv("OPENAI_API_KEY"))

    if request.method == "POST":
        ticket = request.form.get("ticket", "").strip()

        if not ticket:
            return render_template(
                "index.html",
                result=None,
                ticket=ticket,
                error="Please enter a ticket before submitting.",
                ai_configured=ai_configured
            )

        if len(ticket) > MAX_TICKET_LENGTH:
            return render_template(
                "index.html",
                result=None,
                ticket=ticket,
                error=f"Ticket is too long ({len(ticket)} characters). "
                      f"Please shorten it to {MAX_TICKET_LENGTH} characters or fewer.",
                ai_configured=ai_configured
            )

        result = route_ticket(ticket)

        app.logger.info("Routed ticket: %s", result)

        return render_template(
            "index.html",
            result=result,
            ticket=ticket,
            error=None,
            ai_configured=ai_configured
        )

    return render_template(
        "index.html",
        result=None,
        ticket="",
        error=None,
        ai_configured=ai_configured
    )


@app.route("/api/route", methods=["POST"])
def api_route():
    data = request.get_json(silent=True) or {}
    ticket = (data.get("ticket") or "").strip()

    if not ticket:
        return jsonify({"error": "Please enter a ticket before submitting."}), 400

    if len(ticket) > MAX_TICKET_LENGTH:
        return jsonify({
            "error": f"Ticket is too long ({len(ticket)} characters). "
                     f"Please shorten it to {MAX_TICKET_LENGTH} characters or fewer."
        }), 400

    result = route_ticket(ticket)

    app.logger.info("Routed ticket: %s", result)

    return jsonify(result)


@app.route("/api/sample-tickets", methods=["GET"])
def api_sample_tickets():
    try:
        with open(SAMPLE_TICKETS_PATH) as f:
            tickets = json.load(f)
    except (OSError, ValueError) as e:
        app.logger.error("Failed to load sample tickets: %s", e)
        return jsonify({"error": "Could not load sample tickets."}), 500

    return jsonify(tickets)


@app.route("/api/benchmark", methods=["POST"])
def api_benchmark():
    try:
        report = run_benchmark()
    except (OSError, ValueError) as e:
        app.logger.error("Benchmark run failed: %s", e)
        return jsonify({"error": "Benchmark failed to run. Check server logs for details."}), 500

    return jsonify(report["summary"])


if __name__ == "__main__":
    app.run(debug=True,port=5002)