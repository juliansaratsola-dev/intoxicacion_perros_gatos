import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './SurveyDetail.css';

const SurveyDetail = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([0]);

  useEffect(() => {
    fetch(`/surveys/${id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Survey not found');
        return res.json();
      })
      .then((data) => setSurvey(data.survey || data))
      .catch((err) => console.error('Error fetching survey:', err));
  }, [id]);

  const getNextIdx = useCallback((question) => {
    const val = responses[question.id];
    // Check if any option has a `next` jump
    if (question.type === 'selector' && Array.isArray(question.options)) {
      const selected = question.options.find(
        (o) => typeof o === 'object' && o.text === val
      );
      if (selected && selected.next) {
        const targetIdx = survey.questions.findIndex((q) => q.id === selected.next);
        if (targetIdx !== -1) return targetIdx;
      }
      if (selected && selected.next === null) return null; // end survey
    }
    return currentIdx + 1;
  }, [responses, currentIdx, survey]);

  const handleChange = (questionId, value) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  };

  const handleMultiChange = (questionId, value) => {
    setResponses((prev) => {
      const current = prev[questionId] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: updated };
    });
    setError(null);
  };

  const handleTableChange = (questionId, row, col) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), [row]: col },
    }));
    setError(null);
  };

  const handleNext = () => {
    const question = survey.questions[currentIdx];
    if (question.required) {
      const val = responses[question.id];
      const isEmpty =
        val === undefined ||
        val === '' ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0);
      if (isEmpty) {
        setError('Esta pregunta es obligatoria.');
        return;
      }
    }
    const nextIdx = getNextIdx(question);
    if (nextIdx === null) {
      handleSubmit();
      return;
    }
    if (nextIdx >= survey.questions.length) {
      handleSubmit();
      return;
    }
    setHistory((prev) => [...prev, nextIdx]);
    setCurrentIdx(nextIdx);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setCurrentIdx(newHistory[newHistory.length - 1]);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey_id: id, responses }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('Error al enviar. Por favor intente nuevamente.');
      }
    } catch {
      setError('Error de conexión. Por favor intente nuevamente.');
    }
  };

  if (!survey) {
    return (
      <div className="sf-loading">
        <div className="sf-spinner" />
        <p>Cargando encuesta...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="sf-wrapper">
        <div className="sf-header-bar" />
        <div className="sf-card sf-thankyou">
          <div className="sf-thankyou-icon">✓</div>
          <h2>¡Respuesta enviada!</h2>
          <p>Muchas gracias por participar en esta encuesta. Su contribución es de gran valor para el desarrollo académico y científico de la Facultad de Veterinaria (UdelaR).</p>
          <p className="sf-thankyou-contact">Ante cualquier consulta puede comunicarse a: <strong>tesistoxico25@gmail.com</strong></p>
        </div>
      </div>
    );
  }

  const question = survey.questions[currentIdx];
  const progress = Math.round(((currentIdx) / survey.questions.length) * 100);
  const optionText = (o) => (typeof o === 'object' ? o.text : o);

  const renderQuestion = (q) => {
    switch (q.type) {
      case 'text':
        return (
          <textarea
            className="sf-textarea"
            placeholder="Tu respuesta"
            value={responses[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
            rows={3}
          />
        );

      case 'selector':
        return (
          <div className="sf-options">
            {q.options.map((opt, i) => {
              const label = optionText(opt);
              const checked = responses[q.id] === label;
              return (
                <label key={i} className={`sf-option ${checked ? 'sf-option--selected' : ''}`}>
                  <input
                    type="radio"
                    name={q.id}
                    value={label}
                    checked={checked}
                    onChange={() => handleChange(q.id, label)}
                  />
                  <span className="sf-radio-circle" />
                  <span className="sf-option-text">{label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'multiple_selection':
        return (
          <div className="sf-options">
            {q.options.map((opt, i) => {
              const label = optionText(opt);
              const checked = (responses[q.id] || []).includes(label);
              return (
                <label key={i} className={`sf-option ${checked ? 'sf-option--selected' : ''}`}>
                  <input
                    type="checkbox"
                    value={label}
                    checked={checked}
                    onChange={() => handleMultiChange(q.id, label)}
                  />
                  <span className="sf-checkbox-box" />
                  <span className="sf-option-text">{label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'table':
        return (
          <div className="sf-table-wrapper">
            <table className="sf-table">
              <thead>
                <tr>
                  <th className="sf-table-rowlabel" />
                  {q.columns.map((col, ci) => (
                    <th key={ci} className="sf-table-col">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'sf-table-row-even' : 'sf-table-row-odd'}>
                    <td className="sf-table-rowlabel">{row}</td>
                    {q.columns.map((col, ci) => {
                      const selected = (responses[q.id] || {})[row] === col;
                      return (
                        <td key={ci} className="sf-table-cell">
                          <label className="sf-table-radio">
                            <input
                              type="radio"
                              name={`${q.id}-${ri}`}
                              value={col}
                              checked={selected}
                              onChange={() => handleTableChange(q.id, row, col)}
                            />
                            <span className="sf-radio-circle sf-radio-circle--sm" />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  const isLast = currentIdx === survey.questions.length - 1;

  return (
    <div className="sf-wrapper">
      {/* Header card */}
      <div className="sf-header-card">
        <div className="sf-header-bar" />
        <div className="sf-header-content">
          <h1 className="sf-title">{survey.title}</h1>
          <p className="sf-description">{survey.description}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="sf-progress-container">
        <div className="sf-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="sf-progress-label">
        Pregunta {currentIdx + 1} de {survey.questions.length}
      </div>

      {/* Question card */}
      <div className="sf-card">
        <div className="sf-question-number">
          {question.id}.
        </div>
        <h2 className="sf-question-text">
          {question.text}
          {question.required && <span className="sf-required"> *</span>}
        </h2>

        <div className="sf-question-body">
          {renderQuestion(question)}
        </div>

        {error && <div className="sf-error">{error}</div>}
      </div>

      {/* Navigation */}
      <div className="sf-nav">
        {history.length > 1 && (
          <button className="sf-btn sf-btn--secondary" onClick={handleBack}>
            ← Anterior
          </button>
        )}
        <button className="sf-btn sf-btn--primary" onClick={handleNext}>
          {isLast ? 'Enviar' : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
};

export default SurveyDetail;