/**
 * admin.js
 * survey_responses 테이블 데이터를 집계하여 관리자 대시보드에 표시합니다.
 */
(function () {
  const TABLE_NAME = 'survey_responses';

  let allRows = [];
  let charts = {};

  const els = {
    total: document.getElementById('stat-total'),
    today: document.getElementById('stat-today'),
    topReferrer: document.getElementById('stat-top-referrer'),
    topImpression: document.getElementById('stat-top-impression'),
    textList: document.getElementById('text-answers-list'),
    tbody: document.getElementById('responses-tbody'),
    emptyState: document.getElementById('empty-state'),
    search: document.getElementById('search-input'),
    refreshBtn: document.getElementById('refresh-btn'),
    exportBtn: document.getElementById('export-csv-btn')
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function parseAnswers(row) {
    try { return JSON.parse(row.answers_json || '{}'); } catch (e) { return {}; }
  }

  function valueToText(ans) {
    if (!ans) return '';
    const v = ans.value;
    if (Array.isArray(v)) return v.join(', ');
    return v == null ? '' : String(v);
  }

  function classifyReferrer(ref) {
    if (!ref) return '직접/알 수 없음';
    try {
      const host = new URL(ref).hostname;
      return host;
    } catch (e) { return ref; }
  }

  async function fetchAllRows() {
    let page = 1;
    const limit = 100;
    let rows = [];
    while (true) {
      const res = await fetch(`tables/${TABLE_NAME}?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
      const json = await res.json();
      rows = rows.concat(json.data || []);
      if (!json.data || json.data.length < limit) break;
      page++;
      if (page > 50) break; // 안전장치
    }
    return rows.filter((r) => !r.deleted);
  }

  function computeStats(rows) {
    els.total.textContent = rows.length;

    const todayStr = new Date().toDateString();
    const todayCount = rows.filter((r) => {
      const t = r.created_at ? new Date(r.created_at) : null;
      return t && t.toDateString() === todayStr;
    }).length;
    els.today.textContent = todayCount;

    const q1Counts = {};
    const q3Counts = {};
    rows.forEach((r) => {
      const a = parseAnswers(r);
      const q1v = a.q1 ? valueToText(a.q1) : '';
      if (q1v) q1Counts[q1v] = (q1Counts[q1v] || 0) + 1;
      const q3v = a.q3 ? valueToText(a.q3) : '';
      if (q3v) q3Counts[q3v] = (q3Counts[q3v] || 0) + 1;
    });

    const topQ1 = Object.entries(q1Counts).sort((a, b) => b[1] - a[1])[0];
    els.topReferrer.textContent = topQ1 ? topQ1[0] : '-';

    const topQ3 = Object.entries(q3Counts).sort((a, b) => b[1] - a[1])[0];
    els.topImpression.textContent = topQ3 ? topQ3[0] : '-';
  }

  function buildCountsForQuestion(rows, qId, multi) {
    const counts = {};
    rows.forEach((r) => {
      const a = parseAnswers(r);
      const ans = a[qId];
      if (!ans) return;
      let values = ans.value;
      if (!multi) values = [values];
      (values || []).forEach((v) => {
        if (v === undefined || v === null || v === '') return;
        counts[v] = (counts[v] || 0) + 1;
      });
    });
    return counts;
  }

  function renderChart(canvasId, counts, label, colorSet) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if (charts[canvasId]) charts[canvasId].destroy();

    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map((l) => (l.length > 14 ? l.slice(0, 14) + '…' : l)),
        datasets: [{
          label,
          data,
          backgroundColor: colorSet || 'rgba(94, 234, 212, 0.55)',
          borderRadius: 6,
          borderColor: 'rgba(94, 234, 212, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          title: { display: true, text: label, color: '#e6ecff', font: { size: 13, weight: '600' } }
        },
        scales: {
          x: { ticks: { color: '#93a1c7', precision: 0 }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#93a1c7' }, grid: { display: false } }
        }
      }
    });
  }

  function renderCharts(rows) {
    renderChart('chart-q1', buildCountsForQuestion(rows, 'q1', false), 'Q1. 유입 경로');
    renderChart('chart-q2', buildCountsForQuestion(rows, 'q2', true), 'Q2. 찾는 정보 (중복)', 'rgba(129, 140, 248, 0.55)');
    renderChart('chart-q3', buildCountsForQuestion(rows, 'q3', false), 'Q3. 첫인상', 'rgba(244, 114, 182, 0.55)');
    renderChart('chart-q4', buildCountsForQuestion(rows, 'q4', false), 'Q4. 탐색 편의성', 'rgba(250, 204, 21, 0.5)');
  }

  function renderTextAnswers(rows) {
    const items = rows
      .map((r) => {
        const a = parseAnswers(r);
        const v = a.q5 ? valueToText(a.q5) : '';
        return { text: v, date: r.created_at };
      })
      .filter((x) => x.text && x.text.trim());

    if (!items.length) {
      els.textList.innerHTML = '<p style="color:var(--text-sub);">아직 등록된 서술형 답변이 없습니다.</p>';
      return;
    }

    items.sort((a, b) => (b.date || 0) - (a.date || 0));
    els.textList.innerHTML = items.map((it) => `
      <div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:rgba(255,255,255,0.02);">
        <div style="font-size:14px;">${escapeHtml(it.text)}</div>
        <div style="font-size:11px;color:var(--text-sub);margin-top:6px;">
          ${it.date ? new Date(it.date).toLocaleString('ko-KR') : ''}
        </div>
      </div>
    `).join('');
  }

  function renderTable(rows, filterText) {
    const q = (filterText || '').trim().toLowerCase();
    const filtered = !q ? rows : rows.filter((r) => {
      const a = parseAnswers(r);
      const blob = [
        valueToText(a.q1), valueToText(a.q2), valueToText(a.q3),
        valueToText(a.q4), valueToText(a.q5), r.referrer, r.user_agent
      ].join(' ').toLowerCase();
      return blob.includes(q);
    });

    els.emptyState.style.display = filtered.length ? 'none' : 'block';

    const sorted = [...filtered].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    els.tbody.innerHTML = sorted.map((r) => {
      const a = parseAnswers(r);
      const dt = r.created_at ? new Date(r.created_at).toLocaleString('ko-KR') : '-';
      return `
        <tr>
          <td>${dt}</td>
          <td>${escapeHtml(valueToText(a.q1))}</td>
          <td>${escapeHtml(valueToText(a.q2))}</td>
          <td>${escapeHtml(valueToText(a.q3))}</td>
          <td>${escapeHtml(valueToText(a.q4))}</td>
          <td class="answer-cell">${escapeHtml(valueToText(a.q5))}</td>
          <td>${escapeHtml(classifyReferrer(r.referrer))}</td>
        </tr>
      `;
    }).join('');
  }

  function exportCsv() {
    const header = ['제출시각', 'Q1_유입경로', 'Q2_관심정보', 'Q3_첫인상', 'Q4_탐색편의', 'Q5_콘텐츠', 'Referrer', 'PageURL', 'UserAgent'];
    const lines = [header.join(',')];

    [...allRows].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).forEach((r) => {
      const a = parseAnswers(r);
      const dt = r.created_at ? new Date(r.created_at).toLocaleString('ko-KR') : '';
      const row = [
        dt, valueToText(a.q1), valueToText(a.q2), valueToText(a.q3),
        valueToText(a.q4), valueToText(a.q5), r.referrer || '', r.page_url || '', r.user_agent || ''
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(','));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_responses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function refresh() {
    els.refreshBtn.disabled = true;
    try {
      allRows = await fetchAllRows();
      computeStats(allRows);
      renderCharts(allRows);
      renderTextAnswers(allRows);
      renderTable(allRows, els.search.value);
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      els.refreshBtn.disabled = false;
    }
  }

  els.refreshBtn.addEventListener('click', refresh);
  els.exportBtn.addEventListener('click', exportCsv);
  els.search.addEventListener('input', () => renderTable(allRows, els.search.value));

  refresh();
})();
