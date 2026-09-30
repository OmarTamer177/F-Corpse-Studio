from flask import Blueprint, request, jsonify
from models import Inquiry
from extensions import db
import re

contact_bp = Blueprint('contact', __name__)

def is_valid_email(email):
    regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(regex, email) is not None

@contact_bp.route('/', methods=['POST'])
def contact():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request payload"}), 400

    fields = ('name', 'email', 'subject', 'message')
    if any(not isinstance(data.get(field), str) for field in fields):
        return jsonify({"error": "All fields must be text values."}), 400

    name = data['name'].strip()
    email = data['email'].strip()
    subject = data['subject'].strip()
    message = data['message'].strip()

    if not all([name, email, subject, message]):
        return jsonify({"error": "All fields (Name, Email, Subject, Message) are required."}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format."}), 400

    if len(name) > 100 or len(email) > 120 or len(subject) > 200:
        return jsonify({"error": "One or more fields exceed the allowed length."}), 400

    try:
        new_inquiry = Inquiry(name=name, email=email, subject=subject, message=message)
        db.session.add(new_inquiry)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Your message has been successfully submitted!"
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An error occurred while saving to the database."}), 500
