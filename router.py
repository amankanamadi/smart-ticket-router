from prompts import SYSTEM_PROMPT

def build_prompt(ticket):
    return f"""
{SYSTEM_PROMPT}

Support Ticket:
{ticket}
"""


def classify_ticket(ticket):
    """
    Temporary rule-based classifier.
    This will later be replaced with the OpenAI API.
    """

    ticket = ticket.lower()

    if "refund" in ticket or "payment" in ticket or "charged" in ticket or "invoice" in ticket:
        return {
            "category": "Billing",
            "priority": "High",
            "assigned_team": "Billing Team",
            "reasoning": "The ticket is related to payment or billing."
        }

    elif "login" in ticket or "password" in ticket or "account" in ticket:
        return {
            "category": "Account",
            "priority": "Medium",
            "assigned_team": "Account Team",
            "reasoning": "The ticket is related to account access."
        }

    elif "crash" in ticket or "error" in ticket or "bug" in ticket:
        return {
            "category": "Technical",
            "priority": "High",
            "assigned_team": "Technical Support",
            "reasoning": "The ticket reports a technical issue."
        }

    elif "feature" in ticket or "add" in ticket or "dark mode" in ticket:
        return {
            "category": "Feature Request",
            "priority": "Low",
            "assigned_team": "Product Team",
            "reasoning": "The customer is requesting a new feature."
        }

    else:
        return {
            "category": "General Inquiry",
            "priority": "Low",
            "assigned_team": "Customer Support",
            "reasoning": "The ticket does not match any specific category."
        }


def route_ticket(ticket):
    prompt = build_prompt(ticket)

    print("Prompt Sent to AI")
    print(prompt)

    return classify_ticket(ticket)