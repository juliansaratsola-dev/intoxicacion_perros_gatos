import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './SurveyDetail.css';

const SurveyDetail = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([0]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 900);
  const [visited, setVisited] = useState(new Set([0]));
  const sidebarRef = useRef(null);

  useEffect(() => {
    fetch(`/surveys/${id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Survey not found');
        return res.json();
      })
      .then((data) => setSurvey(data.survey || data))
      .catch((err) => console.error('Error fetching survey:', err));
  }, [id]);

  // Scroll active sidebar item into view
  useEffect(() => {
    if (sidebarRef.current) {
      const active = sidebarRef.current.querySelector('.sb-item--current');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIdx, sidebarOpen]);

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
    setVisited((prev) => new Set([...prev, nextIdx]));
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

  // Jump directly to a previously visited question via sidebar
  const handleJumpTo = (idx) => {
    // Only allow jumping to questions already visited
    if (!visited.has(idx)) return;
    // Push to history (no trimming) so back button returns to wherever we jumped from
    setHistory((prev) => [...prev, idx]);
    setCurrentIdx(idx);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Close sidebar on mobile after navigating
    if (window.innerWidth < 900) setSidebarOpen(false);
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
    const answeredCount = Object.keys(responses).length;
    const totalCount    = survey.questions.length;

    // Format a single answer for display in the review
    const fmtReview = (q) => {
      const val = responses[q.id];
      if (val === undefined || val === null || val === '') return null;
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'object') {
        return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('\n');
      }
      return String(val);
    };

    const handlePrint = () => {
      // Make review visible before printing (in case it's collapsed)
      setShowReview(true);
      setTimeout(() => window.print(), 150);
    };

    const answeredQuestions = survey.questions.filter(
      (q) => responses[q.id] !== undefined && responses[q.id] !== ''
    );

    return (
      <div className="sf-thankyou-page">

        {/* ── Thank-you card ── */}
        <div className="sf-thankyou-card no-print">

          {/* Animated checkmark */}
          <div className="sf-thankyou-circle">
            <svg className="sf-thankyou-svg" viewBox="0 0 52 52">
              <circle className="sf-ty-circle" cx="26" cy="26" r="25" fill="none" />
              <path  className="sf-ty-check"  fill="none" d="M14 27l8 8 16-16" />
            </svg>
          </div>

          <h1 className="sf-ty-title">¡Respuesta enviada!</h1>
          <p className="sf-ty-body">
            Muchas gracias por participar en esta encuesta. Su contribución es de
            gran valor para el desarrollo académico y científico de la
            Facultad de Veterinaria (UdelaR).
          </p>

          {/* Stats pill */}
          <div className="sf-ty-stats">
            <span className="sf-ty-stat">
              <strong>{answeredCount}</strong> preguntas respondidas
            </span>
            <span className="sf-ty-sep">·</span>
            <span className="sf-ty-stat">
              de <strong>{totalCount}</strong> totales
            </span>
          </div>

          <p className="sf-ty-contact">
            Ante cualquier consulta puede comunicarse a:{' '}
            <a href="mailto:tesistoxico25@gmail.com" className="sf-ty-email">
              tesistoxico25@gmail.com
            </a>
          </p>

          {/* Action buttons */}
          <div className="sf-ty-actions">
            <button
              className="sf-ty-btn sf-ty-btn--outline"
              onClick={() => setShowReview((v) => !v)}
            >
              {showReview ? '▲ Ocultar respuestas' : '▼ Revisar mis respuestas'}
            </button>
            <button
              className="sf-ty-btn sf-ty-btn--primary"
              onClick={handlePrint}
              title="Guardar o imprimir como PDF"
            >
              ⬇ Descargar PDF
            </button>
          </div>
        </div>

        {/* ── Review section ── */}
        {showReview && (
          <div className="sf-review">

            {/* Print-only header */}
            <div className="sf-review-print-header print-only">
              <h1>{survey.title}</h1>
              <p>{survey.description}</p>
              <p className="sf-review-print-date">
                Fecha de envío: {new Date().toLocaleString('es-UY')}
              </p>
              <hr />
            </div>

            <h2 className="sf-review-title no-print">Mis respuestas</h2>

            <ol className="sf-review-list">
              {answeredQuestions.map((q) => {
                const answer = fmtReview(q);
                if (!answer) return null;
                return (
                  <li key={q.id} className="sf-review-item">
                    <p className="sf-review-q">
                      <span className="sf-review-qnum">{q.id}.</span> {q.text}
                    </p>
                    <div className="sf-review-a">
                      {answer.split('\n').map((line, i) => (
                        <span key={i} className="sf-review-a-line">{line}</span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Print footer */}
            <p className="sf-review-footer print-only">
              Encuesta de intoxicaciones en pequeños animales · Facultad de Veterinaria, UdelaR
            </p>
          </div>
        )}
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

  // ── Sidebar helpers ───────────────────────────────────────
  // Visited indices in survey order (not history order)
  const visitedIndices = survey.questions
    .map((_, idx) => idx)
    .filter((idx) => visited.has(idx));

  const formatAnswer = (q, val) => {
    if (val === undefined || val === null || val === '') return null;
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') {
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
    }
    return String(val);
  };

  const truncate = (str, n) =>
    str && str.length > n ? str.slice(0, n).trimEnd() + '…' : str;

  return (
    <div className={`sf-layout ${sidebarOpen ? 'sf-layout--open' : ''}`}>

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className={`sf-sidebar ${sidebarOpen ? 'sf-sidebar--open' : ''}`} ref={sidebarRef}>
        <div className="sf-sidebar-header">
          <span className="sf-sidebar-title">Progreso</span>
          <button
            className="sf-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar panel"
          >✕</button>
        </div>

        {/* Mini progress bar inside sidebar */}
        <div className="sf-sidebar-progress-track">
          <div
            className="sf-sidebar-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="sf-sidebar-progress-label">{progress}% completado</p>

        {/* Question list */}
        <ul className="sb-list">
          {survey.questions.map((q, idx) => {
            const isCurrent  = idx === currentIdx;
            const isVisited  = visitedIndices.includes(idx);
            const isAnswered = isVisited && responses[q.id] !== undefined && responses[q.id] !== '';
            const answer     = isAnswered ? formatAnswer(q, responses[q.id]) : null;

            if (!isVisited && !isCurrent) return null; // hide future questions

            return (
              <li
                key={q.id}
                role="button"
                tabIndex={isCurrent ? -1 : 0}
                title={isCurrent ? 'Pregunta actual' : 'Ir a esta pregunta'}
                className={[
                  'sb-item',
                  isCurrent   ? 'sb-item--current'   : '',
                  isAnswered  ? 'sb-item--answered'  : '',
                  !isCurrent  ? 'sb-item--clickable' : '',
                ].join(' ')}
                onClick={() => !isCurrent && handleJumpTo(idx)}
                onKeyDown={(e) => e.key === 'Enter' && !isCurrent && handleJumpTo(idx)}
              >
                <div className="sb-item-top">
                  <span className="sb-item-num">{q.id}</span>
                  {isAnswered && <span className="sb-item-check">✓</span>}
                  {!isCurrent && <span className="sb-item-goto">↩</span>}
                </div>
                <p className="sb-item-text">{truncate(q.text, 80)}</p>
                {answer && (
                  <p className="sb-item-answer">{truncate(answer, 60)}</p>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sf-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ───────────────────────────────────── */}
      <div className="sf-main">

        {/* Toggle button */}
        <button
          className="sf-sidebar-toggle"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Abrir panel de progreso"
          title="Ver progreso"
        >
          {sidebarOpen ? '◀' : '▶'}
          {!sidebarOpen && (
            <span className="sf-toggle-badge">{visitedIndices.length}</span>
          )}
        </button>

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
      </div>
    </div>
  );
};

export default SurveyDetail;