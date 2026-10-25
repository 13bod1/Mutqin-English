Feature: Real PostgREST role and receipt acceptance
  # Actual isolated PostgreSQL16 + PostgREST16.5; not production GoTrue.

  Scenario: function_privileges
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true

  Scenario: pinned_search_paths
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true

  Scenario: student_cannot_create_approved_payment
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: student_cannot_create_other_students_payment
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: student_cannot_review_receipt
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: anon_cannot_execute_receipt_rpc
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 401

  Scenario: student_cannot_self_elevate
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: staff_cannot_bypass_review_audit
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: studentB_private_profile_denied
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: assistant_financial_report_denied
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: student_financial_report_denied
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: admin_financial_report_allowed
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: studentB_idor_payment_denied
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: real_receipt_review_1
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: real_receipt_review_2
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: real_receipt_review_3
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: nonnull_lecture_grant
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true

  Scenario: duplicate_review_rejected
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 400

  Scenario: exactly_three_review_events
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true

  Scenario: subsequent_approval_preserves_consumption
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: consumption_not_reset
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true

  Scenario: admin_publishes_announcement
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 201

  Scenario: independent_student_reads_shared_announcement
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: student_cannot_publish_announcement
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 403

  Scenario: admin_updates_announcement
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: student_cannot_delete_announcement
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200

  Scenario: admin_deletes_announcement
    Given the isolated database and signed local test identity
    When the recorded SQL or actual HTTP operation is executed
    Then the assertion passes: true
    And the actual HTTP status is 200
