@payments @reconciliation @sprint3
Feature: Payment Reconciliation and Refund Management (AG-48)
  As an administrator or platform owner
  I want to audit payment gateway transactions, identify settlement discrepancies, and process refunds
  So that financial books are reconciled and double refunds are prevented

  Background:
    Given the admin user is logged in
    And transactions have been processed via Card, InstaPay, Vodafone Cash, and Etisalat Cash

  @reconciliation @reporting
  Scenario: Admin generates reconciliation summary with payment method breakdown
    When the admin visits "/admin/payments" and selects "Reconciliation"
    Then the system displays totals collected per payment method
    And highlights gateway mismatches where expected fee differs from reported amount
    And provides a one-click "Export CSV" feature

  @security @role-access
  Scenario: Assistant role is restricted from viewing financial revenue totals
    Given a staff member logged in with role "assistant"
    When the assistant views the payments and reconciliation page
    Then financial revenue totals and net earnings are masked
    And the assistant is informed that revenue is restricted to platform owners

  @refunds @state-flow
  Scenario: Staff processes a refund through requested, approved, and refunded states
    Given a settled payment "#p4" of 350 EGP
    When staff clicks "Request Refund" with reason "Course cancellation"
    Then a refund record is created with status "requested"
    When administrator approves the refund
    Then status updates to "approved"
    When the payment gateway confirms payout
    Then status updates to "refunded"

  @negative @double-refund
  Scenario: Prevent duplicate refund requests on the same transaction
    Given a payment that already has an approved or completed refund
    When another refund request is submitted for the same payment
    Then the system rejects the request with an error: "Double refunds are prevented"
