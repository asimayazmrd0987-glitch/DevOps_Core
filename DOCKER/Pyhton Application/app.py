from flask import Flask
import socket

app = Flask(__name__)

@app.route("/")
def home():
    hostname = socket.gethostname()

    return f"""
    <h1>Hello from Docker Container 🐳</h1>
    <p>Running inside container: {hostname}</p>
    """

@app.route("/health")
def health():
    return {
        "status": "healthy",
        "message": "Application is running"
    }


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )
