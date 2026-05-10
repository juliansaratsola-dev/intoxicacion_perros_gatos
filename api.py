from flask import Flask, jsonify, request
from flask_restful import Api, Resource
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
api = Api(app)

# Database connection setup
def get_db_connection():
    conn = psycopg2.connect(
        dbname="survey.db",
        user="julian.saratsola",  # PostgreSQL username
        password="islasdeflores1866",  # Replace with your PostgreSQL password
        host="localhost",
        port="5432"
    )
    return conn
# Update SurveyList to fetch surveys from the database
class SurveyList(Resource):
    def get(self):
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM surveys;")
        surveys = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({"surveys": surveys})

# Update Survey to include conditions
class Survey(Resource):
    def get(self, survey_id):
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM surveys WHERE id = %s;", (survey_id,))
        survey = cursor.fetchone()

        if not survey:
            cursor.close()
            conn.close()
            return {"message": "Survey not found"}, 404

        # Fetch questions for the survey
        cursor.execute("SELECT * FROM questions WHERE survey_id = %s;", (survey_id,))
        questions = cursor.fetchall()

        # Fetch conditions for the survey
        cursor.execute("SELECT * FROM conditions WHERE survey_id = %s;", (survey_id,))
        conditions = cursor.fetchall()

        cursor.close()
        conn.close()

        survey["questions"] = questions
        survey["conditions"] = conditions
        return jsonify(survey)

    def post(self, survey_id):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM surveys WHERE id = %s;", (survey_id,))
        survey = cursor.fetchone()

        if not survey:
            cursor.close()
            conn.close()
            return {"message": "Survey not found"}, 404

        data = request.get_json()
        # Save the response data to the database
        cursor.execute(
            "INSERT INTO responses (survey_id, question_id, response) VALUES (%s, %s, %s);",
            (survey_id, data.get("question_id"), data.get("response"))
        )
        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Response received", "data": data}, 201

# Define API routes
api.add_resource(SurveyList, '/surveys')
api.add_resource(Survey, '/surveys/<int:survey_id>')

# Add a default route to handle the root URL
@app.route('/')
def home():
    return jsonify({"message": "Welcome to the Survey API!"})

if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=5000)