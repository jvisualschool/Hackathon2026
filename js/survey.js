/**
 * survey.js
 * data/questions.md 를 불러와 설문 문항을 렌더링하고,
 * 응답을 tables/survey_responses 에 저장합니다.
 */
(function () {
  const TABLE_NAME = 'survey_responses';

  const introView = document.getElementById('intro-view');
  const formView = document.getElementById('form-view');
  const doneView = document.getElementById('done-view');
  const errorView = document.getElementById('error-view');

  const titleEl = document.getElementById('survey-title');
  const introEl = document.getElementById('survey-intro');
  const startBtn = document.getElementById('start-btn');
  const stage = document.getElementById('question-stage');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');

  let survey = null;
  let currentIndex = 0;
  const answers = {}; // qId -> string | string[]
  const otherText = {}; // qId -> free text for "기타"

  function showError(msg) {
    errorView.style.display = 'block';
    errorView.textContent = msg;
  }

  async function loadQuestions() {
    const res = await fetch('data/questions.md', { cache: 'no-store' });
    if (!res.ok) throw new Error('설문 문항 파일을 불러오지 못했습니다 (data/questions.md)');
    const text = await res.text();
    return window.SurveyMdParser.parseSurveyMarkdown(text);
  }

  function renderIntro() {
    titleEl.textContent = survey.title || '홈페이지 방문 피드백';
    introEl.textContent = survey.intro || '';
  }

  function renderQuestion(index) {
    const q = survey.questions[index];
    if (!q) return;

    let html = `
      <div class="fade-in">
        <div class="q-title">${q.number}. ${escapeHtml(q.title)}</div>
        ${q.description ? `<div class="q-desc">${escapeHtml(q.description)}</div>` : ''}
        <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;" id="options-wrap">
    `;

    if (q.type === 'text') {
      const val = answers[q.id] || '';
      html += `<textarea id="text-answer" rows="4" placeholder="자유롭게 의견을 남겨주세요...">${escapeHtml(val)}</textarea>`;
    } else {
      const selected = answers[q.id];
      q.options.forEach((opt, i) => {
        const optId = `opt-${q.id}-${i}`;
        const isSelected = q.type === 'multi'
          ? Array.isArray(selected) && selected.includes(opt.value)
          : selected === opt.value;
        html += `
          <label class="option-card ${isSelected ? 'selected' : ''}" data-value="${escapeAttr(opt.value)}" data-other="${opt.other ? '1' : '0'}" id="${optId}">
            <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="q-${q.id}" style="accent-color:#5eead4;width:16px;height:16px;flex-shrink:0;" ${isSelected ? 'checked' : ''} />
            <span>${escapeHtml(opt.label)}</span>
          </label>
        `;
        if (opt.other) {
          const showOtherBox = isSelected;
          html += `
            <input type="text" id="other-text-${q.id}" placeholder="직접 입력해주세요"
              style="display:${showOtherBox ? 'block' : 'none'};margin-left:12px;"
              value="${escapeAttr(otherText[q.id] || '')}" />
          `;
        }
      });
    }

    html += `</div></div>`;
    stage.innerHTML = html;

    if (q.type === 'text') {
      document.getElementById('text-answer').addEventListener('input', (e) => {
        answers[q.id] = e.target.value;
      });
    } else {
      const cards = stage.querySelectorAll('.option-card');
      cards.forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
          const value = card.getAttribute('data-value');
          const isOther = card.getAttribute('data-other') === '1';

          if (q.type === 'multi') {
            const set = new Set(Array.isArray(answers[q.id]) ? answers[q.id] : []);
            if (set.has(value)) set.delete(value); else set.add(value);
            answers[q.id] = Array.from(set);
            card.classList.toggle('selected', set.has(value));
            const cb = card.querySelector('input');
            if (cb) cb.checked = set.has(value);
          } else {
            answers[q.id] = value;
            cards.forEach((c) => c.classList.remove('selected'));
            card.classList.add('selected');
            const radio = card.querySelector('input');
            if (radio) radio.checked = true;
          }

          if (isOther) {
            const box = document.getElementById(`other-text-${q.id}`);
            if (box) {
              const shouldShow = q.type === 'multi'
                ? (Array.isArray(answers[q.id]) && answers[q.id].includes(value))
                : answers[q.id] === value;
              box.style.display = shouldShow ? 'block' : 'none';
              if (shouldShow) box.focus();
            }
          }
        });
      });

      q.options.forEach((opt) => {
        if (opt.other) {
          const box = document.getElementById(`other-text-${q.id}`);
          if (box) {
            box.addEventListener('input', (e) => { otherText[q.id] = e.target.value; });
          }
        }
      });
    }

    updateProgress();
    prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    nextBtn.innerHTML = index === survey.questions.length - 1
      ? '제출하기 <i class="fa-solid fa-paper-plane"></i>'
      : '다음 <i class="fa-solid fa-arrow-right"></i>';
  }

  function updateProgress() {
    const total = survey.questions.length;
    const pct = Math.round(((currentIndex) / total) * 100);
    progressFill.style.width = pct + '%';
    progressLabel.textContent = `${currentIndex + 1} / ${total}`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  function goNext() {
    if (currentIndex < survey.questions.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
      window.scrollTo({ top: formView.offsetTop - 20, behavior: 'smooth' });
    } else {
      submitSurvey();
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion(currentIndex);
    }
  }

  function buildAnswersPayload() {
    const payload = {};
    survey.questions.forEach((q) => {
      let value = answers[q.id];
      if (value === undefined) value = q.type === 'multi' ? [] : '';

      // "기타" 옵션 선택 시 자유 텍스트 병합
      const hasOther = q.options.some((o) => o.other);
      if (hasOther && otherText[q.id]) {
        if (q.type === 'multi' && Array.isArray(value) && value.includes('other')) {
          value = value.map((v) => (v === 'other' ? `기타: ${otherText[q.id]}` : v));
        } else if (value === 'other') {
          value = `기타: ${otherText[q.id]}`;
        }
      }

      payload[q.id] = { title: q.title, type: q.type, value };
    });
    return payload;
  }

  async function submitSurvey() {
    nextBtn.disabled = true;
    nextBtn.textContent = '전송 중...';
    try {
      const record = {
        answers_json: JSON.stringify(buildAnswersPayload()),
        referrer: document.referrer || '',
        page_url: location.href,
        user_agent: navigator.userAgent
      };
      const res = await fetch(`tables/${TABLE_NAME}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (!res.ok) throw new Error('제출 중 오류가 발생했습니다.');

      formView.style.display = 'none';
      doneView.style.display = 'block';
    } catch (err) {
      showError(err.message || String(err));
      nextBtn.disabled = false;
      nextBtn.innerHTML = '제출하기 <i class="fa-solid fa-paper-plane"></i>';
    }
  }

  startBtn.addEventListener('click', () => {
    introView.style.display = 'none';
    formView.style.display = 'block';
    currentIndex = 0;
    renderQuestion(currentIndex);
  });

  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  (async function init() {
    try {
      survey = await loadQuestions();
      if (!survey.questions.length) throw new Error('설문 문항이 비어 있습니다.');
      renderIntro();
    } catch (err) {
      showError(err.message || String(err));
    }
  })();
})();
