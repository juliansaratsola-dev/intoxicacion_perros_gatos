import unittest
import json
from api import app

class TestSurveyAPI(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_home(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/json')
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertEqual(data['message'], 'Welcome to the Survey API!')

    def test_get_surveys(self):
        response = self.app.get('/surveys')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/json')
        data = json.loads(response.data)
        self.assertIn('surveys', data)
        self.assertIsInstance(data['surveys'], list)

    def test_get_survey(self):
        response = self.app.get('/surveys/1')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/json')
        data = json.loads(response.data)
        self.assertIn('id', data)
        self.assertEqual(data['id'], 1)

    def test_get_nonexistent_survey(self):
        response = self.app.get('/surveys/999')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content_type, 'application/json')
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertEqual(data['message'], 'Survey not found')

    def test_post_survey_response(self):
        response_data = {
            "question_id": 1,
            "response": "Perro"
        }
        response = self.app.post('/surveys/1',
                                 data=json.dumps(response_data),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.content_type, 'application/json')
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertEqual(data['message'], 'Response received')
        self.assertIn('data', data)
        self.assertEqual(data['data'], response_data)

if __name__ == '__main__':
    unittest.main()