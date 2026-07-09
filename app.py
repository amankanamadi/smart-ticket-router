from flask import Flask, render_template, request
from router import route_ticket

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def home():

    if request.method == "POST":
        ticket = request.form["ticket"]

        result = route_ticket(ticket)

        print(result)

        return render_template(
            "index.html",
            result=result,
            ticket=ticket
        )

    return render_template("index.html", result=None, ticket="")


if __name__ == "__main__":
    app.run(debug=True)