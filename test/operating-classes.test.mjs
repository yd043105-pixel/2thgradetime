import test from 'node:test';
import assert from 'node:assert/strict';
import { timetableData } from '../src/data.js';

const expectedOperatingClasses = {
  '물질과 에너지': ['2a5', '2b6', '2c1'],
  '세포와 물질대사': ['2b1', '2c6', '2d5'],
  '역학과 에너지': ['2a1', '2d3'],
  '지구과학': ['2a3', '2b2', '2c4'],
  '인공지능 수학': ['2d4'],
  '법과 사회': ['2a6', '2c3', '2d2'],
  '사회와 문화': ['2b3', '2c2', '2d1'],
  '세계사': ['2a4', '2b5', '2d6'],
  '세계시민과 지리': ['2a2', '2b4', '2c5'],
  '언어생활과 한자': ['2e1', '2e2', '2e3'],
  '일본문화': ['2e4', '2e5', '2e6'],
};

test('PDF 기준 운영 반을 과목별로 제공한다', () => {
  assert.deepEqual(timetableData.operatingClasses, expectedOperatingClasses);
});

test('시간표 기준일을 2026년 8월 18일로 기록한다', () => {
  assert.equal(timetableData.updatedAt, '2026-08-18');
});

test('운영 반 코드를 학년과 반 표기로 바꾼다', async () => {
  let formatOperatingClass;
  try {
    ({ formatOperatingClass } = await import('../src/operating-class-label.js'));
  } catch {
    assert.fail('운영 반 표기 변환 함수를 찾지 못했습니다.');
  }
  assert.equal(formatOperatingClass('2c1'), '2학년 1반');
});

test('학생별 최신 선택과목과 명단 변경을 반영한다', () => {
  const idaKyung = timetableData.students.find((student) => student.name === '이다경');
  assert.ok(idaKyung);
  assert.deepEqual(
    idaKyung.assignments.find((assignment) => assignment.subject === '법과 사회'),
    {
      subject: '법과 사회',
      courseCode: 'T162895',
      group: 'C',
      division: '1',
    },
  );
  assert.equal(idaKyung.assignments.some((assignment) => assignment.subject === '지구과학'), false);
  assert.equal(
    idaKyung.schedule.flatMap((slot) => slot.items).some((item) => item.title === '지구과학'),
    false,
  );
  assert.equal(
    idaKyung.schedule.flatMap((slot) => slot.items).filter((item) => item.title === '법과 사회').length,
    3,
  );
  assert.equal(timetableData.students.length, 122);
  assert.equal(timetableData.students.some((student) => student.name === '정주원'), false);
  assert.equal(timetableData.students.some((student) => student.name === '정유진'), false);
  assert.equal(timetableData.students.some((student) => student.name === '정지안'), true);
});

test('추가된 김좌현의 반과 선택과목 시간표를 반영한다', () => {
  const student = timetableData.students.find((candidate) => candidate.name === '김좌현');
  assert.ok(student);
  assert.equal(student.grade, 2);
  assert.equal(student.classNo, '1');
  assert.equal(student.studentNo, '22');

  const expectedAssignments = {
    '법과 사회': 'A',
    '지구과학': 'B',
    '사회와 문화': 'C',
    '세계사': 'D',
  };
  assert.deepEqual(
    Object.fromEntries(student.assignments.map((assignment) => [assignment.subject, assignment.group])),
    expectedAssignments,
  );

  const scheduleItems = student.schedule.flatMap((slot) => slot.items);
  for (const [subject, group] of Object.entries(expectedAssignments)) {
    const items = scheduleItems.filter((item) => item.kind === 'elective' && item.title === subject);
    assert.equal(items.length, 3);
    assert.equal(items.every((item) => item.group === group && item.code === `2${group.toLowerCase()}`), true);
  }

  const japanItems = scheduleItems.filter((item) => item.kind === 'etrack');
  assert.equal(japanItems.length, 3);
  assert.equal(japanItems.every((item) => item.title === '일본문화' && item.code === '2e4' && item.teacher === '오태훈'), true);
});

test('유은서의 선택과목 재배정과 운영 반을 반영한다', () => {
  const student = timetableData.students.find((candidate) => candidate.name === '유은서');
  assert.ok(student);

  const expectedGroups = {
    '물질과 에너지': 'A',
    '세포와 물질대사': 'B',
    '지구과학': 'C',
    '역학과 에너지': 'D',
  };
  const assignmentGroups = Object.fromEntries(
    student.assignments.map((assignment) => [assignment.subject, assignment.group]),
  );
  assert.deepEqual(
    Object.fromEntries(Object.keys(expectedGroups).map((subject) => [subject, assignmentGroups[subject]])),
    expectedGroups,
  );

  const scheduleItems = student.schedule.flatMap((slot) => slot.items);
  for (const [subject, group] of Object.entries(expectedGroups)) {
    const items = scheduleItems.filter((item) => item.kind === 'elective' && item.title === subject);
    assert.equal(items.length, 3);
    assert.equal(items.every((item) => item.group === group && item.code === `2${group.toLowerCase()}`), true);
  }
});

test('학생별 언어생활과 한자·일본문화 수강명단을 반영한다', async () => {
  let etrackEnrollments;
  try {
    ({ etrackEnrollments } = await import('../src/etrack-enrollments.js'));
  } catch {
    assert.fail('학생별 e분반 수강명단 매핑을 찾지 못했습니다.');
  }

  assert.equal(Object.keys(etrackEnrollments).length, 121);
  assert.deepEqual(etrackEnrollments['김민지'], {
    subject: '언어생활과 한자',
    code: '2e1',
    teacher: '구미경',
  });
  assert.deepEqual(etrackEnrollments['김예은'], {
    subject: '언어생활과 한자',
    code: '2e2',
    teacher: '구미경',
  });
  assert.deepEqual(etrackEnrollments['강다현'], {
    subject: '일본문화',
    code: '2e4',
    teacher: '오태훈',
  });
  assert.deepEqual(etrackEnrollments['정지안'], {
    subject: '일본문화',
    code: '2e5',
    teacher: '오태훈',
  });
  assert.equal(etrackEnrollments['정주원'], undefined);

  const eTrackItemsFor = (name) => timetableData.students
    .find((student) => student.name === name)
    .schedule
    .flatMap((slot) => slot.items)
    .filter((item) => item.kind === 'etrack');
  const uniqueETrackDetailsFor = (name) => [
    ...new Set(eTrackItemsFor(name).map((item) => `${item.title}|${item.code}|${item.teacher}`)),
  ];

  assert.deepEqual(uniqueETrackDetailsFor('김민지'), ['언어생활과 한자|2e1|구미경']);
  assert.deepEqual(uniqueETrackDetailsFor('김예은'), ['언어생활과 한자|2e2|구미경']);
  assert.deepEqual(uniqueETrackDetailsFor('강다현'), ['일본문화|2e4|오태훈']);
  assert.deepEqual(uniqueETrackDetailsFor('정지안'), ['일본문화|2e5|오태훈']);

  const eTrackCounts = timetableData.students
    .flatMap((student) => student.schedule.flatMap((slot) => slot.items))
    .filter((item) => item.kind === 'etrack')
    .reduce((counts, item) => ({ ...counts, [item.code]: (counts[item.code] ?? 0) + 1 }), {});
  assert.deepEqual(eTrackCounts, {
    '2e1': 54,
    '2e2': 66,
    '2e3': 57,
    '2e4': 72,
    '2e5': 54,
    '2e6': 63,
  });
});
