window.Survey = (function(){
  function parseShowIf(el){
    if (!el.dataset.showIf) return null;
    try{ return JSON.parse(el.dataset.showIf); }catch(e){ return null; }
  }

  function evaluateCondition(cond){
    for (const key in cond){
      const val = cond[key];
      const inputs = document.getElementsByName(key);
      if (!inputs || inputs.length === 0) return false;
      let found = false;
      for (const inp of inputs){
        if ((inp.type === 'radio' || inp.type === 'checkbox') && inp.checked){
          if (inp.value === val) found = true;
        } else if (inp.tagName === 'INPUT' || inp.tagName === 'TEXTAREA' || inp.tagName === 'SELECT'){
          if (inp.value === val) found = true;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  function clearFieldValues(el){
    const inputs = el.querySelectorAll('input, textarea, select');
    inputs.forEach(i => {
      if (i.type === 'radio' || i.type === 'checkbox') i.checked = false;
      else i.value = '';
      i.classList.remove('is-invalid');
      const fb = el.querySelector('.invalid-feedback');
      if (fb) fb.textContent = '';
    });
  }

  function updateVisibility(){
    const qEls = document.querySelectorAll('.question');
    qEls.forEach(el => {
      const cond = parseShowIf(el);
      if (!cond) { el.style.display = ''; return; }
      if (evaluateCondition(cond)) el.style.display = '';
      else {
        el.style.display = 'none';
        clearFieldValues(el);
      }
    });
  }

  function attachListeners(){
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(i => i.addEventListener('change', updateVisibility));
  }

  function clearValidation(){
    document.querySelectorAll('.is-invalid').forEach(el=>el.classList.remove('is-invalid'));
    document.querySelectorAll('.invalid-feedback').forEach(el=>el.textContent='');
    document.getElementById('message').innerHTML = '';
  }

  function setFieldError(name, msg){
    const group = document.getElementById('q-' + name);
    if (!group) return;
    // radio groups
    const radios = group.querySelectorAll('input[type="radio"][name="' + name + '"]');
    if (radios && radios.length){
      radios.forEach(r=>r.classList.add('is-invalid'));
      const fb = group.querySelector('.invalid-feedback');
      if (fb) fb.textContent = msg;
      return;
    }
    // single input/select/textarea
    const field = group.querySelector('[name="' + name + '"]');
    if (field){
      field.classList.add('is-invalid');
      const fb = group.querySelector('.invalid-feedback');
      if (fb) fb.textContent = msg;
    }
  }

  function validateForm(){
    clearValidation();
    const qEls = document.querySelectorAll('.question');
    let valid = true;
    // simple email and numeric checks
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const numericNames = ['age_years','weight_kg','time_since_exposure_hours'];

    qEls.forEach(el => {
      if (el.style.display === 'none') return; // ignored when hidden
      const name = el.id.replace('q-','');
      const input = el.querySelector('[name]');
      const required = !!(input && (input.required || el.querySelector('input[required], select[required], textarea[required]')));

      if (!input && !el.querySelector('input')) return;

      // handle radio groups
      const radios = el.querySelectorAll('input[type="radio"]');
      if (radios && radios.length){
        if (required){
          let any = false;
          radios.forEach(r=>{ if (r.checked) any = true });
          if (!any){ valid = false; setFieldError(name, 'Seleccione una opción.'); }
        }
        return;
      }

      // handle matrix inputs
      const matrixInputs = el.querySelectorAll('input[type="radio"]');
      if (matrixInputs && matrixInputs.length){
        const rows = new Set(matrixInputs.map(input => input.name.split('[')[1].split(']')[0]));
        rows.forEach(row => {
          const rowInputs = Array.from(matrixInputs).filter(input => input.name.includes(`[${row}]`));
          if (required && !rowInputs.some(input => input.checked)) {
            valid = false;
            setFieldError(`${name}[${row}]`, 'Seleccione una opción para cada fila.');
          }
        });
        return;
      }

      // handle rating inputs
      const ratingInputs = el.querySelectorAll('input[type="range"]');
      if (ratingInputs && ratingInputs.length){
        ratingInputs.forEach(input => {
          if (required && !input.value) {
            valid = false;
            setFieldError(input.name, 'Seleccione un valor.');
          }
        });
        return;
      }

      // other inputs
      const val = input ? input.value.trim() : '';
      // apply validation rules from data-validation if present
      let vRules = null;
      try{ vRules = el.dataset.validation ? JSON.parse(el.dataset.validation) : null }catch(e){ vRules = null }
      if (required && (!val || val === '')){ valid = false; setFieldError(name, 'Este campo es obligatorio.'); return; }

      if (vRules){
        if (vRules.type === 'number' && val){
          const v = val.replace(',','.');
          if (isNaN(Number(v))){ valid = false; setFieldError(name, 'Debe ser un número.'); return; }
          if (vRules.min !== undefined && Number(v) < Number(vRules.min)){ valid = false; setFieldError(name, 'Valor por debajo del mínimo.'); return; }
          if (vRules.max !== undefined && Number(v) > Number(vRules.max)){ valid = false; setFieldError(name, 'Valor por encima del máximo.'); return; }
        }
        if (vRules.pattern && val){
          const re = new RegExp(vRules.pattern);
          if (!re.test(val)){ valid = false; setFieldError(name, 'Formato inválido.'); return; }
        }
        if (vRules.minLength && val.length < vRules.minLength){ valid = false; setFieldError(name, `Mínimo ${vRules.minLength} caracteres.`); return; }
        if (vRules.maxLength && val.length > vRules.maxLength){ valid = false; setFieldError(name, `Máximo ${vRules.maxLength} caracteres.`); return; }
      }
      // fallback checks
      if (val && numericNames.includes(name)){
        const v = val.replace(',','.');
        if (isNaN(Number(v))){ valid = false; setFieldError(name, 'Debe ser un número.'); }
      }
      if (val && name === 'contact_email'){
        if (!emailRe.test(val)){ valid = false; setFieldError(name, 'Correo inválido.'); }
      }
    });

    return valid;
  }

  fetch('/surveys/main_encuesta.json')
    .then(response => response.json())
    .then(data => {
      // Renderizar preguntas dinámicamente
      renderSurvey(data);
    });

  function renderSurvey(data) {
    // Implementar lógica para renderizar preguntas
    console.log('Encuesta cargada:', data);
  }

  return { init: function(){ attachListeners(); updateVisibility(); }, updateVisibility, validateForm };
})();
