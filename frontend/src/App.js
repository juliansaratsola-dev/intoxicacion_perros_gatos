import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SurveyList from './components/SurveyList';
import SurveyDetail from './components/SurveyDetail';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<SurveyList />} />
          <Route path="/surveys/:id" element={<SurveyDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
