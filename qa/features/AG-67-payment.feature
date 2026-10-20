# language: en
@Sprint2 @PBI-12 @AG-67 @AG-68
Feature: In-Site Payment Checkout & Webhook Security
  As a student or guardian
  I want to pay for a session inside the website itself
  So that I do not leave the platform or rely on manual WhatsApp confirmations

  Background:
    Given the student is logged in with active session
    And the student selects a lecture or live session priced at 250 EGP

  Scenario: Successful checkout and automatic session activation
    When the student initiates an in-site payment checkout
    Then a new payment session is created with status "pending"
    And the expiration time is set to 15 minutes from now
    When the payment processor completes successfully
    Then the payment status transitions to "success"
    And the lecture is immediately unlocked in the student library

  Scenario: Failed payment due to card decline
    When the student submits payment with insufficient funds or declined card
    Then the payment status transitions to "failed"
    And the retry count increments by 1
    And a clear bilingual message in Arabic and English is shown
    And the student is given an option to retry the checkout

  Scenario: User cancelled checkout
    When the student dismisses or cancels the checkout modal
    Then the payment status transitions to "cancelled"
    And no funds are deducted or charged

  Scenario: Expired payment session prevention
    Given the student initiated a payment session more than 15 minutes ago
    When the student attempts to finalize the checkout
    Then the transaction is rejected with status "expired"
    And the student is prompted to start a fresh checkout

  Scenario: Duplicate payment prevention for already active session
    Given the student has already purchased and activated lecture "lec_106"
    When the student attempts to initiate a second payment for "lec_106"
    Then the system flags the transaction as "duplicate"
    And blocks redundant charges

  @Security @Webhook
  Scenario: Rejection of tampered or unsigned webhook requests
    Given a third-party gateway webhook arrives with invalid or missing HMAC signature
    When the webhook handler evaluates the request
    Then the request is rejected with HTTP 401 Unauthorized
    And the lecture session is NOT activated

  @Security @Webhook @Idempotency
  Scenario: Idempotent processing of duplicate webhook notifications
    Given a valid webhook for payment event "evt_replay_001" is delivered
    When the webhook is processed the first time
    Then the session is activated with HTTP 200 OK
    When an identical duplicate webhook with "evt_replay_001" is re-sent by the gateway
    Then the handler acknowledges receipt with HTTP 200 OK
    And ignores the duplicate activation to prevent race conditions

  @Security
  Scenario: Audit for zero gateway private key exposure in client bundles
    When the client bundle, local storage and window scope are scanned for sensitive keys
    Then no private keys starting with "sk_live_" or "whsec_" are detected
    And only safe public client keys are visible

  @Fallback
  Scenario: InstaPay / Cash receipt fallback submission
    Given the student chooses the InstaPay receipt upload fallback
    When the student submits payer phone "01012345678", reference "TXN-987654321", and "voucher.png"
    Then the receipt is saved with status "pending_review"
    And the assistant is notified for verification within the SLA
