import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const SurveyDetail = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    fetch(`/surveys/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Survey not found');
        }
        return response.json();
      })
      .then((data) => setSurvey(data))
      .catch((error) => console.error('Error fetching survey:', error));
  }, [id]);

  const handleResponseChange = (questionId, value) => {
    setResponses((prevResponses) => ({
      ...prevResponses,
      [questionId]: value,
    }));
  };

  const isQuestionVisible = (questionId) => {
    if (!survey || !survey.conditions) return true;

    const condition = survey.conditions.find(
      (cond) => cond.target_question_id === questionId
    );

    if (!condition) return true;

    const { question_id, condition: conditionExpression } = condition;
    const response = responses[question_id];

    try {
      // Evaluate the condition dynamically
      return eval(conditionExpression.replace('response', JSON.stringify(response)));
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  };

  if (!survey) {
    return <div>Cargando encuesta...</div>;
  }

  return (
    <div>
      <h1>{survey.title}</h1>
      <form>
        {survey.questions.map((question) => (
          isQuestionVisible(question.id) && (
            <div key={question.id}>
              <label>{question.text}</label>
              {question.type === 'text' && (
                <input
                  type="text"
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                />
              )}
              {question.type === 'boolean' && (
                <select
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                >
                  <option value="">Seleccione una opción</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              )}
            </div>
          )
        ))}
      </form>
    </div>
  );
};

export default SurveyDetail;