from flask import Flask, jsonify
import os
import psycopg2
from psycopg2 import OperationalError

app = Flask(__name__)

def get_db_connection():
   
    connection = psycopg2.connect(
        host=os.getenv("DB_HOST", "database"),      
        dbname=os.getenv("POSTGRES_DB", "flaskdb"),  
        user=os.getenv("POSTGRES_USER", "flaskuser"), 
        password=os.getenv("POSTGRES_PASSWORD", "flaskpass") 
    )
    return connection


@app.route("/")
def home():
 
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS visitors (
                id SERIAL PRIMARY KEY,
                visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                message TEXT
            );
        """)

        cursor.execute(
            "INSERT INTO visitors (message) VALUES (%s);",
            ("Someone visited the homepage!",)
        )

        cursor.execute("SELECT COUNT(*) FROM visitors;")
        total_visits = cursor.fetchone()[0]

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": "Flask app is running AND connected to PostgreSQL!",
            "total_visits": total_visits
        })

    except OperationalError as e:
        return jsonify({
            "status": "error",
            "message": "Could not connect to the database.",
            "details": str(e)
        }), 500


@app.route("/health")
def health():
    
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    print("=" * 50)
    print("🚀 Starting Flask API...")
    print(f"   DB_HOST: {os.getenv('DB_HOST', 'database')}")
    print(f"   DB_PORT: {os.getenv('DB_PORT', '5432')}")
    print("=" * 50)

    app.run(host="0.0.0.0", port=5000)