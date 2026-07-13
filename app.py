from flask import Flask, render_template, request
from router import route_ticket

app = Flask(__name__)

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

        result = route_ticket(ticket)

        app.logger.info("Routed ticket: %s", result)

        return render_template(
            "index.html",
            result=result,
            ticket=ticket,
            error=None
        )

    return render_template("index.html", result=None, ticket="", error=None)


if __name__ == "__main__":
    app.run(debug=True)