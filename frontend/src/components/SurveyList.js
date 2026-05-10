import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SurveyList = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect directly to the main survey
    navigate('/surveys/main_encuesta');
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#9333ea' }}>
      <p>Redirigiendo a la encuesta...</p>
    </div>
  );
};

export default SurveyList;