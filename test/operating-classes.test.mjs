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
  assert.equal(timetableData.students.length, 121);
  assert.equal(timetableData.students.some((student) => student.name === '정주원'), false);
  assert.equal(timetableData.students.some((student) => student.name === '정유진'), false);
  assert.equal(timetableData.students.some((student) => student.name === '정지안'), true);
});
