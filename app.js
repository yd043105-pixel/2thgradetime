import { timetableData } from './src/data.js';

const $ = (selector) => document.querySelector(selector);
const data = timetableData;
const state = { selected: null, matches: [] };

const searchInput = $('#student-search');
const searchResults = $('#search-results');
const resultSection = $('#result-section');
const emptyState = $('#empty-state');
const toast = $('#toast');

$('#student-count').textContent = `학생 ${data.students.length}명`;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function normalize(value) {
  return String(value || '').toLocaleLowerCase().replace(/\s+/g, '');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function getOperatingClass(subject, group) {
  const groupCode = String(group || '').toLowerCase();
  return (data.operatingClasses[subject] || []).find((code) => code.startsWith(`2${groupCode}`)) || '';
}

function getMatches(value) {
  const query = normalize(value);
  if (!query) return [];
  return data.students
    .filter((student) => normalize(student.name).includes(query) || normalize(student.id).includes(query))
    .sort((a, b) => {
      const aExact = normalize(a.name) === query ? 0 : 1;
      const bExact = normalize(b.name) === query ? 0 : 1;
      return aExact - bExact || a.name.localeCompare(b.name, 'ko');
    });
}

function renderSearchResults(matches) {
  if (!matches.length) {
    searchResults.innerHTML = searchInput.value.trim()
      ? '<p class="search-empty">일치하는 학생을 찾지 못했습니다.</p>'
      : '';
    return;
  }
  const visible = matches.slice(0, 8);
  searchResults.innerHTML = `
    <div class="result-heading">${matches.length > 1 ? '학생을 선택하세요' : '조회 결과'}</div>
    <div class="result-options">
      ${visible.map((student) => `
        <button class="result-option" type="button" data-student-id="${escapeHtml(student.id)}">
          <span>${escapeHtml(student.name)}</span>
          <small>${student.grade}학년 ${student.classNo}반 ${student.studentNo}번</small>
        </button>
      `).join('')}
    </div>
    ${matches.length > 8 ? `<p class="result-overflow">검색 결과 ${matches.length}명 중 8명을 표시합니다.</p>` : ''}
  `;
  searchResults.querySelectorAll('[data-student-id]').forEach((button) => {
    button.addEventListener('click', () => selectStudent(button.dataset.studentId));
  });
}

function formatStudentMeta(student) {
  return `${student.grade}학년 ${student.classNo}반 ${student.studentNo}번 / 주간 수업 ${student.schedule.reduce((sum, slot) => sum + slot.items.length, 0)}개`;
}

function renderAssignments(student) {
  const target = $('#assignment-list');
  if (!student.assignments.length) {
    target.innerHTML = '<span class="assignment-empty">등록된 선택과목이 없습니다.</span>';
    return;
  }
  target.innerHTML = student.assignments.map((assignment) => `
    <span class="assignment-chip">
      <strong>${escapeHtml(assignment.subject)}</strong>
      <small>${escapeHtml(assignment.group)}구획 / ${escapeHtml(assignment.division)}분반</small>
      <em>운영 반 ${escapeHtml(getOperatingClass(assignment.subject, assignment.group) || '-')}</em>
    </span>
  `).join('');
}

function renderCell(slot) {
  if (!slot.items.length) {
    return '<div class="schedule-cell is-empty" role="gridcell"><span class="empty-label">-</span></div>';
  }
  return `<div class="schedule-cell ${slot.items.length > 1 ? 'has-conflict' : ''}" role="gridcell">
    ${slot.items.map((item) => `
      <div class="cell-item ${item.kind === 'elective' ? 'is-elective' : item.kind === 'special' ? 'is-special' : item.kind === 'etrack' ? 'is-etrack' : 'is-home'}">
        <span class="cell-type">${item.kind === 'elective' ? '선택과목' : item.kind === 'special' ? '학교 일정' : item.kind === 'etrack' ? 'e 시간표' : '수업'}</span>
        <strong>${escapeHtml(item.title)}</strong>
        ${item.teacher ? `<small>${escapeHtml(item.teacher)}</small>` : ''}
        ${item.kind === 'elective' ? `<em>운영 반 ${escapeHtml(getOperatingClass(item.title, item.group) || '-')}</em>` : ''}
      </div>
    `).join('')}
  </div>`;
}

function renderSchedule(student) {
  const grid = $('#schedule-grid');
  const header = ['교시', ...data.days].map((day, index) => index === 0
    ? '<div class="grid-corner" role="columnheader">교시</div>'
    : `<div class="day-header day-${index}" role="columnheader">${day}</div>`).join('');
  const body = data.periods.map((period, periodIndex) => {
    const periodLabel = `<div class="period-label" role="rowheader"><strong>${period}</strong><small>교시</small></div>`;
    const slots = data.days.map((_, dayIndex) => renderCell(student.schedule[dayIndex * 7 + periodIndex])).join('');
    return periodLabel + slots;
  }).join('');
  grid.innerHTML = header + body;

  $('#mobile-schedule').innerHTML = data.days.map((day, dayIndex) => {
    const daySlots = data.periods.map((period, periodIndex) => `
      <div class="mobile-slot">
        <div class="mobile-period"><strong>${period}</strong><small>교시</small></div>
        ${renderCell(student.schedule[dayIndex * 7 + periodIndex])}
      </div>
    `).join('');
    return `
      <section class="mobile-day" aria-labelledby="mobile-day-${dayIndex}">
        <div class="mobile-day-header">
          <h3 id="mobile-day-${dayIndex}">${day}</h3>
          <span>${student.schedule.slice(dayIndex * 7, dayIndex * 7 + 7).filter((slot) => slot.items.length).length}개 시간</span>
        </div>
        <div class="mobile-day-list">${daySlots}</div>
      </section>
    `;
  }).join('');
}

function renderStudent(student) {
  state.selected = student;
  $('#student-avatar').textContent = student.name.slice(0, 1);
  $('#student-name').textContent = student.name;
  $('#student-meta').textContent = formatStudentMeta(student);
  renderAssignments(student);
  renderSchedule(student);
  emptyState.hidden = true;
  resultSection.hidden = false;
  document.title = `${student.name} | 여양고 2학년 2학기 학생별 시간표 조회`;
}

function selectStudent(studentId) {
  const student = data.students.find((candidate) => candidate.id === studentId);
  if (!student) return;
  searchInput.value = student.name;
  searchResults.innerHTML = '';
  state.matches = [student];
  renderStudent(student);
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function submitSearch(event) {
  event.preventDefault();
  const matches = getMatches(searchInput.value);
  state.matches = matches;
  if (!matches.length) {
    renderSearchResults(matches);
    showToast('이름을 다시 확인해 주세요.');
    return;
  }
  const exact = matches.filter((student) => normalize(student.name) === normalize(searchInput.value));
  if (exact.length === 1) {
    selectStudent(exact[0].id);
    return;
  }
  renderSearchResults(matches);
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const characters = [...String(text)];
  const lines = [];
  let line = '';
  characters.forEach((character) => {
    const candidate = line + character;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => context.fillText(value, x, y + lineHeight * index));
}

function downloadScheduleImage() {
  if (!state.selected) return;
  const student = state.selected;
  const scale = 2;
  const width = 1600;
  const height = 1160;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  context.scale(scale, scale);
  context.fillStyle = '#f7f9fc';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#14213d';
  context.font = '700 36px Arial, "Noto Sans KR", sans-serif';
  context.fillText('개인 시간표', 72, 74);
  context.fillStyle = '#667085';
  context.font = '500 16px Arial, "Noto Sans KR", sans-serif';
  context.fillText('2026학년도 2학기 / 시간표 기준일 2026. 8. 18.', 72, 104);
  context.fillStyle = '#14213d';
  context.font = '700 30px Arial, "Noto Sans KR", sans-serif';
  context.fillText(student.name, 72, 165);
  context.fillStyle = '#667085';
  context.font = '500 17px Arial, "Noto Sans KR", sans-serif';
  context.fillText(`${student.grade}학년 ${student.classNo}반 ${student.studentNo}번`, 72, 194);

  const left = 72;
  const top = 240;
  const labelWidth = 92;
  const gap = 10;
  const cellWidth = (width - left * 2 - labelWidth - gap * 5) / 5;
  const headerHeight = 60;
  const cellHeight = 100;
  context.fillStyle = '#14213d';
  drawRoundedRect(context, left, top, labelWidth, headerHeight, 14);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '700 17px Arial, "Noto Sans KR", sans-serif';
  context.fillText('교시', left + 23, top + 35);
  data.days.forEach((day, index) => {
    const x = left + labelWidth + gap + (cellWidth + gap) * index;
    context.fillStyle = index === 2 ? '#e86a33' : '#eaf1f7';
    drawRoundedRect(context, x, top, cellWidth, headerHeight, 14);
    context.fill();
    context.fillStyle = index === 2 ? '#ffffff' : '#14213d';
    context.font = '700 18px Arial, "Noto Sans KR", sans-serif';
    context.fillText(day, x + 24, top + 35);
  });

  data.periods.forEach((period, periodIndex) => data.days.forEach((_, dayIndex) => {
    const slot = student.schedule[dayIndex * 7 + periodIndex];
    const x = left + labelWidth + gap + (cellWidth + gap) * dayIndex;
    const y = top + headerHeight + gap + (cellHeight + gap) * periodIndex;
    const item = slot.items[0];
    context.fillStyle = item?.kind === 'special' ? '#eef3f8' : '#ffffff';
    drawRoundedRect(context, x, y, cellWidth, cellHeight, 12);
    context.fill();
    context.strokeStyle = '#dfe4ea';
    context.lineWidth = 1;
    context.stroke();
    if (item) {
      context.fillStyle = item.kind === 'elective' ? '#e86a33' : '#14213d';
      context.font = '700 13px Arial, "Noto Sans KR", sans-serif';
      context.fillText(item.kind === 'special' ? '학교 일정' : item.kind === 'elective' ? '선택과목' : item.kind === 'etrack' ? 'e 시간표' : '수업', x + 18, y + 21);
      context.font = '700 17px Arial, "Noto Sans KR", sans-serif';
      drawWrappedText(context, item.title, x + 18, y + 47, cellWidth - 42, 22, 2);
      context.fillStyle = '#667085';
      context.font = '500 14px Arial, "Noto Sans KR", sans-serif';
      context.fillText(item.teacher || '학교 운영 시간', x + 18, y + 84);
    } else {
      context.fillStyle = '#b7c0ca';
      context.font = '500 18px Arial, "Noto Sans KR", sans-serif';
      context.fillText('-', x + 18, y + 42);
    }
    context.fillStyle = '#14213d';
    drawRoundedRect(context, left, y, labelWidth, cellHeight, 12);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 20px Arial, "Noto Sans KR", sans-serif';
    context.fillText(String(slot.period), left + 29, y + 34);
    context.font = '500 13px Arial, "Noto Sans KR", sans-serif';
    context.fillText('교시', left + 28, y + 58);
  }));

  context.fillStyle = '#667085';
  context.font = '500 13px Arial, "Noto Sans KR", sans-serif';
  context.fillText('선택과목은 구획과 분반 배정 기준으로 표시합니다.', 72, 1120);
  const filename = `${student.name}_2학기_개인시간표.png`.replace(/[\\/:*?"<>|]/g, '_');
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('시간표 이미지를 저장했습니다.');
}

searchInput.addEventListener('input', () => {
  const matches = getMatches(searchInput.value);
  state.matches = matches;
  renderSearchResults(matches);
});
$('#search-form').addEventListener('submit', submitSearch);
$('#download-button').addEventListener('click', downloadScheduleImage);

