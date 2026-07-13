from flask import Flask, render_template, request, jsonify
from router import route_ticket

app = Flask(__name__)

MAX_TICKET_LENGTH = 5000

@app.route("/", methods=["GET", "POST"])
def home():

    if request.method == "POST":
        ticket = request.form.get("ticket", "").strip()

        if not ticket:
            return render_template(
                "index.html",
                result=None,
                ticket=ticket,
                error="Please enter a ticket before submitting."
            )

        if len(ticket) > MAX_TICKET_LENGTH:
            return render_template(
                "index.html",
                result=None,
                ticket=ticket,
                error=f"Ticket is too long ({len(ticket)} characters). "
                      f"Please shorten it to {MAX_TICKET_LENGTH} characters or fewer."
            )

        result = route_ticket(ticket)

        app.logger.info("Routed ticket: %s", result)

        return render_template(
            "index.html",
            result=result,
            ticket=ticket,
            error=None
        )

    return render_template("index.html", result=None, ticket="", error=None)


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


if __name__ == "__main__":
    app.run(debug=True,port=5002)