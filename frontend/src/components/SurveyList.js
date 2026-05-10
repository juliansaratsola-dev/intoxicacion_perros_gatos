import React, { useEffect, useState } from 'react';

const SurveyList = () => {
  const [surveys, setSurveys] = useState([]);

  useEffect(() => {
    fetch('/surveys')
      .then((response) => response.json())
      .then((data) => setSurveys(data.surveys))
      .catch((error) => console.error('Error fetching surveys:', error));
  }, []);

  return (
    <div>
      <h1>Lista de Encuestas</h1>
      <ul>
        {surveys.map((survey) => (
          <li key={survey.id}>{survey.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default SurveyList;