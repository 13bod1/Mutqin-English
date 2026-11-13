# AG-95 / PBI-22 — Live Q&A with moderated questions
# Acceptance criteria: 15-second rate limit, XSS sanitization, moderator approve/reject,
# student view only shows approved questions.

Feature: Live Q&A with Moderation

  Background:
    Given a live class session is active
    And the student "Ahmed" is enrolled in the class

  Scenario: TC-QNA-01 Student submits a question successfully
    Given the student "Ahmed" has not submitted a question in the last 15 seconds
    When "Ahmed" types "What is the quadratic formula?" and taps Submit
    Then the question is added with status "pending"
    And the question appears in the moderator queue

  Scenario: TC-QNA-02 Rate limit prevents duplicate submissions within 15 seconds
    Given "Ahmed" submitted a question 5 seconds ago
    When "Ahmed" tries to submit another question
    Then the submit button is disabled
    And a countdown timer shows the remaining cooldown (≤ 15 s)

  Scenario: TC-QNA-03 XSS content is sanitized on submission
    When "Ahmed" submits the question text "<script>alert('xss')</script>"
    Then the stored question text contains no HTML script tags
    And the displayed question is "&lt;script&gt;alert('xss')&lt;/script&gt;" or plain text

  Scenario: TC-QNA-04 Moderator approves a pending question
    Given a question from "Ahmed" is in "pending" status
    When the moderator clicks "Approve"
    Then the question status changes to "approved"
    And the question is visible in the student-facing Q&A feed

  Scenario: TC-QNA-05 Moderator rejects a pending question
    Given a question from "Ahmed" is in "pending" status
    When the moderator clicks "Reject"
    Then the question status changes to "rejected"
    And the question does NOT appear in the student-facing Q&A feed

  Scenario: TC-QNA-06 Students only see approved questions
    Given there are 2 "approved" questions and 1 "pending" question and 1 "rejected" question
    When a student views the Q&A feed
    Then only the 2 "approved" questions are displayed
    And the pending and rejected questions are hidden

  Scenario: TC-QNA-07 Moderator can filter the question queue
    Given there are questions in various states in the moderator panel
    When the moderator selects the "pending" filter tab
    Then only questions with status "pending" are listed

  Scenario: TC-QNA-08 Rate limit resets after 15 seconds
    Given "Ahmed" submitted a question exactly 15 seconds ago
    When the cooldown timer reaches 0
    Then the submit button becomes enabled again
    And "Ahmed" can submit a new question
