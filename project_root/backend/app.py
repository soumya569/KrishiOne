from flask import Flask, request, jsonify
from flask_restful import Api, Resource
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from PIL import Image
import os
from dotenv import load_dotenv
import datetime
import requests

from typing import Optional, List, Dict

# Load environment variables
load_dotenv()
app = Flask(__name__)
api = Api(app)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///farmers.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Models (corrected imports)
from sqlalchemy import Column, Integer, String, Float  # Added missing imports

class User(db.Model):
    id = Column('user_id', Integer, primary_key=True)
    username = Column(String(50))
    password = Column(String(100))  # Store hashed password in real app
    location = Column(String(100))

class Produce(db.Model):
    id = Column('produce_id', Integer, primary_key=True)
    farmer_id = Integer
    crop = Column(String(50))
    quantity = Column(Float)
    price = Column(Float)
    location = Column(String(100))

with app.app_context():
    db.create_all()

# AI setup and helpers
HUGGINGFACE_API_TOKEN: Optional[str] = os.getenv("HUGGINGFACE_API_TOKEN")

def _hf_headers() -> Dict[str, str]:
    if HUGGINGFACE_API_TOKEN:
        return {"Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}"}
    return {}

def detect_disease_with_ai(image_path: str) -> Optional[str]:
    """Send image to a vision classifier on Hugging Face Inference API.
    Returns top-1 class label or None if AI isn't configured/available.
    """
    if not HUGGINGFACE_API_TOKEN:
        return None
    url = "https://api-inference.huggingface.co/models/microsoft/resnet-50"
    try:
        with open(image_path, "rb") as f:
            data = f.read()
        resp = requests.post(url, headers=_hf_headers(), data=data, timeout=20)
        resp.raise_for_status()
        result = resp.json()
        if isinstance(result, list) and result:
            # Expecting [{"label": "...", "score": 0.99}, ...]
            return result[0].get("label")
        return None
    except Exception:
        return None

def forecast_prices_with_ai(commodity: str, days_ahead: int) -> Optional[List[float]]:
    """Placeholder for price forecasting via text generation or hosted model.
    Returns None if AI isn't configured.
    """
    # Keep it simple for now; extend to a real model later
    return None

def chat_with_ai(prompt: str) -> Optional[str]:
    """Use Hugging Face text-generation Inference API if available.
    Returns generated text or None if AI isn't configured.
    """
    if not HUGGINGFACE_API_TOKEN:
        return None
    url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
    payload = {
        "inputs": f"You are a helpful agriculture assistant. Q: {prompt}\nA:",
        "parameters": {"max_new_tokens": 128, "temperature": 0.7}
    }
    try:
        resp = requests.post(url, headers={**_hf_headers(), "Content-Type": "application/json"}, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # HF responses vary by model; handle both text-generation and pipeline outputs
        if isinstance(data, list) and data:
            maybe_text = data[0].get("generated_text") or data[0].get("summary_text")
            if maybe_text:
                return maybe_text.split("A:")[-1].strip()
        if isinstance(data, dict):
            maybe_text = data.get("generated_text") or data.get("summary_text")
            if maybe_text:
                return maybe_text.strip()
        return None
    except Exception:
        return None

# Dummy data and functions
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

REMEDIES = {
    "healthy": "Crop is healthy!",
    "blight": "Apply fungicide.",
    "rust": "Use sulfur dust."
}

# Resources (Endpoints)
class CropDoctor(Resource):
    def post(self):
        if 'file' not in request.files:
            return {"error": "No file part"}, 400
        file = request.files['file']
        if file.filename == '':
            return {"error": "No selected file"}, 400
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            # Try AI disease detection first; fallback to dummy
            disease = detect_disease_with_ai(file_path) or "blight"
            remedy = REMEDIES.get(disease, "Consult expert.")
            return {"disease": disease, "remedy": remedy}, 200
        return {"error": "File type not allowed"}, 400

class MandiPrices(Resource):
    def get(self, commodity):
        # Dummy data - replace with Data.gov.in API
        dummy_data = [
            {"commodity": commodity, "price": 2000, "state": "Punjab", "date": str(datetime.date.today())}
        ]
        return {"prices": dummy_data}, 200

class PriceForecast(Resource):
    def get(self, commodity, days_ahead=7):
        # Try AI forecasting; fallback to simple linear trend
        try:
            days = int(days_ahead)
        except Exception:
            days = 7
        ai_forecast = forecast_prices_with_ai(commodity, days)
        if ai_forecast and len(ai_forecast) == days:
            forecast = ai_forecast
        else:
            base_price = 2000
            forecast = [base_price + i * 10 for i in range(days)]
        return {"commodity": commodity, "forecast": forecast}, 200

class ProduceListing(Resource):
    def post(self):
        data = request.get_json()
        new_produce = Produce(
            farmer_id=data['farmer_id'],
            crop=data['crop'],
            quantity=data['quantity'],
            price=data['price'],
            location=data['location']
        )
        db.session.add(new_produce)
        db.session.commit()
        return {"id": new_produce.id, "message": "Listing created"}, 201

    def get(self, crop=None):
        if crop:
            listings = Produce.query.filter_by(crop=crop).all()
        else:
            listings = Produce.query.all()
        return [{"id": l.id, "crop": l.crop, "quantity": l.quantity, "price": l.price, "location": l.location} for l in listings], 200

class WeatherAdvisory(Resource):
    def get(self, city):
        # Dummy weather - replace with OpenWeatherMap API
        weather_data = {
            "city": city,
            "temp": 25,
            "weather": "Sunny",
            "advice": "Good for planting"
        }
        return weather_data, 200

class Chatbot(Resource):
    def post(self):
        data = request.get_json()
        question = data.get('question', '')
        # Try AI chat; fallback to rule-based tip
        response = chat_with_ai(question) or "Use organic fertilizer for better yield."
        return {"question": question, "answer": response}, 200

class UserAuth(Resource):
    def post(self):  # Register
        data = request.get_json()
        if User.query.filter_by(username=data['username']).first():
            return {"error": "Username taken"}, 400
        new_user = User(username=data['username'], password=data['password'], location=data.get('location'))
        db.session.add(new_user)
        db.session.commit()
        return {"message": "User registered"}, 201

    def get(self, username):  # Login (simplified)
        user = User.query.filter_by(username=username).first()
        if user and user.password == request.args.get('password'):  # Use hashing in real app
            return {"message": "Login successful", "username": user.username}, 200
        return {"error": "Invalid credentials"}, 401

# Add resources to API
api.add_resource(CropDoctor, '/api/crop-doctor')
api.add_resource(MandiPrices, '/api/mandi-prices/<string:commodity>')
api.add_resource(PriceForecast, '/api/price-forecast/<string:commodity>')
api.add_resource(ProduceListing, '/api/listings', '/api/listings/<string:crop>')
api.add_resource(WeatherAdvisory, '/api/weather-advisory/<string:city>')
api.add_resource(Chatbot, '/api/chatbot')
api.add_resource(UserAuth, '/api/auth', '/api/auth/<string:username>')

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    port = int(os.getenv('PORT', '5000'))
    host = os.getenv('HOST', '127.0.0.1')
    app.run(debug=True, host=host, port=port)