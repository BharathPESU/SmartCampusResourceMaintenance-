import test from 'node:test';
import assert from 'node:assert/strict';
import {
  doIntervalsOverlap,
  validateBookingTime,
  isValidComplaintTransition,
  checkPermission,
  cosineSimilarity,
  generateDeterministicEmbedding,
} from './logic';

test('doIntervalsOverlap correctly identifies colliding time slots', () => {
  // Slot A: 10:00 - 11:00
  const slotA = {
    start: new Date('2026-10-25T10:00:00Z'),
    end: new Date('2026-10-25T11:00:00Z'),
  };

  // Colliding Slot B: 10:30 - 11:30
  const slotB = {
    start: new Date('2026-10-25T10:30:00Z'),
    end: new Date('2026-10-25T11:30:00Z'),
  };
  assert.equal(doIntervalsOverlap(slotA, slotB), true);

  // Consecutive non-overlapping Slot C: 11:00 - 12:00 (half-open [10:00, 11:00) does not overlap [11:00, 12:00))
  const slotC = {
    start: new Date('2026-10-25T11:00:00Z'),
    end: new Date('2026-10-25T12:00:00Z'),
  };
  assert.equal(doIntervalsOverlap(slotA, slotC), false);

  // Completely separate slot
  const slotD = {
    start: new Date('2026-10-25T14:00:00Z'),
    end: new Date('2026-10-25T15:00:00Z'),
  };
  assert.equal(doIntervalsOverlap(slotA, slotD), false);
});

test('validateBookingTime rejects invalid durations and reversed dates', () => {
  const t1 = new Date('2026-10-25T10:00:00Z');
  const t2 = new Date('2026-10-25T09:00:00Z'); // end before start
  const resultReversed = validateBookingTime(t1, t2);
  assert.equal(resultReversed.valid, false);

  const tTooShortEnd = new Date('2026-10-25T10:05:00Z'); // only 5 min
  const resultShort = validateBookingTime(t1, tTooShortEnd);
  assert.equal(resultShort.valid, false);

  const tValidEnd = new Date('2026-10-25T11:00:00Z'); // 60 min
  const resultValid = validateBookingTime(t1, tValidEnd);
  assert.equal(resultValid.valid, true);
});

test('isValidComplaintTransition enforces the strict maintenance state machine', () => {
  assert.equal(isValidComplaintTransition('OPEN', 'ASSIGNED'), true);
  assert.equal(isValidComplaintTransition('OPEN', 'IN_PROGRESS'), false); // Cannot skip assignment
  assert.equal(isValidComplaintTransition('ASSIGNED', 'IN_PROGRESS'), true);
  assert.equal(isValidComplaintTransition('IN_PROGRESS', 'RESOLVED'), true);
  assert.equal(isValidComplaintTransition('RESOLVED', 'OPEN'), true); // Can reopen
});

test('checkPermission enforces role and record ownership authorization', () => {
  // Campus user can book and raise complaint
  assert.equal(checkPermission({ role: 'CAMPUS_USER', action: 'CREATE_BOOKING' }), true);
  assert.equal(checkPermission({ role: 'CAMPUS_USER', action: 'RAISE_COMPLAINT' }), true);

  // Campus user CANNOT assign staff or run DB lab or view salary
  assert.equal(checkPermission({ role: 'CAMPUS_USER', action: 'ASSIGN_COMPLAINT' }), false);
  assert.equal(checkPermission({ role: 'CAMPUS_USER', action: 'RUN_DB_LAB' }), false);
  assert.equal(checkPermission({ role: 'CAMPUS_USER', action: 'VIEW_SALARY' }), false);

  // Campus user can only cancel their OWN booking
  assert.equal(checkPermission({ role: 'CAMPUS_USER', action: 'CANCEL_BOOKING', isRecordOwner: true }), true);
  assert.equal(checkPermission({ role: 'CAMPUS_USER', action: 'CANCEL_BOOKING', isRecordOwner: false }), false);

  // Maintenance staff can update complaint status
  assert.equal(checkPermission({ role: 'MAINTENANCE_STAFF', action: 'UPDATE_COMPLAINT_STATUS' }), true);
  assert.equal(checkPermission({ role: 'MAINTENANCE_STAFF', action: 'RUN_DB_LAB' }), false);

  // Admin has full control
  assert.equal(checkPermission({ role: 'ADMIN', action: 'RUN_DB_LAB' }), true);
  assert.equal(checkPermission({ role: 'ADMIN', action: 'VIEW_SALARY' }), true);
  assert.equal(checkPermission({ role: 'ADMIN', action: 'ASSIGN_COMPLAINT' }), true);
});

test('cosineSimilarity accurately scores semantic vectors', () => {
  const vec1 = [1, 0, 0];
  const vec2 = [1, 0, 0];
  const vec3 = [0, 1, 0];
  assert.equal(Math.round(cosineSimilarity(vec1, vec2) * 100) / 100, 1);
  assert.equal(Math.round(cosineSimilarity(vec1, vec3) * 100) / 100, 0);

  // Test keyword matching deterministic embedding
  const embAC = generateDeterministicEmbedding('Air conditioning unit is not cooling and fan stopped');
  const embVent = generateDeterministicEmbedding('Ventilation fan is broken and AC is warm');
  const embProjector = generateDeterministicEmbedding('Projector HDMI display cable missing');

  const similarityACVent = cosineSimilarity(embAC, embVent);
  const similarityACProjector = cosineSimilarity(embAC, embProjector);

  // Air conditioning and ventilation fan should be significantly more similar than air conditioning and projector!
  assert.ok(
    similarityACVent > similarityACProjector,
    `Expected AC-Vent similarity (${similarityACVent}) to exceed AC-Projector similarity (${similarityACProjector})`
  );
});
