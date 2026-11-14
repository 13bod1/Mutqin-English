import { TestBed } from '@angular/core/testing';
import { LiveQnaService } from './live-qna.service';

describe('LiveQnaService (PBI-22 / AG-95 & AG-124)', () => {
  let service: LiveQnaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LiveQnaService],
    });
    service = TestBed.inject(LiveQnaService);
  });

  it('TC-QNA-01: should submit a student question with initial pending moderation status', () => {
    const res = service.submitQuestion(
      'live_sec3_session',
      'u1',
      'Nour Saeed',
      'Could you explain the difference between active and passive voice in this example?'
    );

    expect(res.success).toBeTrue();
    expect(res.question).toBeDefined();
    expect(res.question?.status).toBe('pending');
    expect(res.question?.studentId).toBe('u1');
  });

  it('TC-QNA-02: should strictly enforce 15-second rate limit cooldown between questions', () => {
    // 1st question succeeds
    const first = service.submitQuestion(
      'live_sec3_session',
      'u10',
      'Student Ten',
      'First valid question about English prepositions.'
    );
    expect(first.success).toBeTrue();

    // 2nd question immediately after is rejected with remaining seconds
    const second = service.submitQuestion(
      'live_sec3_session',
      'u10',
      'Student Ten',
      'Second rapid question sent too quickly.'
    );
    expect(second.success).toBeFalse();
    expect(second.secondsRemaining).toBeGreaterThanOrEqual(14);
    expect(second.error).toContain('Please wait');
  });

  it('TC-QNA-03: should sanitize input against XSS, script injection, and unwanted tags', () => {
    const malicious = '<script>alert("hacked")</script>Hello <b>teacher</b>, what is <img src="x" onerror="evil()" /> the homework?';
    const clean = service.sanitizeText(malicious);

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('</script>');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('<b>');
    expect(clean).toContain('Hello teacher, what is  the homework?');
  });

  it('TC-QNA-04: students should see only approved questions plus their own pending question', (done) => {
    // Seed question for u5
    service.submitQuestion('live_session_filter', 'u5', 'Student Five', 'My pending private inquiry');

    service.getStudentQuestions('live_session_filter', 'u5').subscribe((list) => {
      // u5 sees their own pending question
      const myQ = list.find((q) => q.studentId === 'u5');
      expect(myQ).toBeDefined();

      // Non-approved questions from others are hidden
      const otherPending = list.filter((q) => q.studentId !== 'u5' && q.status === 'pending');
      expect(otherPending.length).toBe(0);
      done();
    });
  });

  it('TC-QNA-05: staff should be able to moderate questions through approved, answered, or hidden states', () => {
    const res = service.submitQuestion(
      'live_moderation_test',
      'u7',
      'Student Seven',
      'Valid question for moderation verification'
    );
    const qId = res.question!.id;

    // Approve
    const approved = service.updateQuestionStatus(qId, 'approved', 'Sara Hassan (Assistant)');
    expect(approved).toBeTrue();

    // Mark Answered
    const answered = service.updateQuestionStatus(qId, 'answered', 'Mr. Adel Mostafa');
    expect(answered).toBeTrue();
  });
});
