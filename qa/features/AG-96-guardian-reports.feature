# AG-96 / PBI-23 — Guardian Weekly Progress Reports
# Acceptance criteria: 7-day expiring private links, admin master toggle,
# guardian contact CRUD with delete-on-request.

Feature: Guardian Weekly Progress Reports

  Background:
    Given the admin has enabled "Guardian Reports" in academy settings
    And the student "Sara" has a guardian contact email "parent@example.com"

  Scenario: TC-GRD-01 Admin can generate a guardian report link
    Given the admin is on the student progress page for "Sara"
    When the admin clicks "Generate Guardian Report Link"
    Then a unique token-based URL is created
    And the URL is valid for 7 days from creation

  Scenario: TC-GRD-02 Guardian accesses report within 7 days
    Given a guardian report link was generated for "Sara" 3 days ago
    When the guardian opens the link in a browser
    Then the weekly progress report is displayed
    And the report shows attendance, quiz scores, and lecture progress

  Scenario: TC-GRD-03 Guardian report link expires after 7 days
    Given a guardian report link was generated for "Sara" 8 days ago
    When the guardian tries to open the expired link
    Then an error message is shown indicating the link has expired
    And no student data is displayed

  Scenario: TC-GRD-04 Admin can disable guardian reports globally
    Given "Guardian Reports" is currently enabled
    When the admin toggles off "Guardian Reports" in settings
    Then existing guardian links return an error when accessed
    And no new report links can be generated

  Scenario: TC-GRD-05 Guardian contact can be added for a student
    Given the student "Sara" has no guardian contact on record
    When the admin adds guardian email "parent@example.com" and name "Mrs. Ahmed"
    Then the contact is saved and displayed in the student profile
    And a confirmation is shown

  Scenario: TC-GRD-06 Guardian contact can be updated
    Given the student "Sara" has guardian contact "old@example.com"
    When the admin updates the email to "new@example.com"
    Then the contact record reflects the new email

  Scenario: TC-GRD-07 Guardian contact is deleted on request (GDPR/privacy)
    Given the student "Sara" has an active guardian contact
    When the guardian submits a deletion request
    Then the contact record is permanently removed
    And all associated report links are invalidated

  Scenario: TC-GRD-08 Report link is not cached by the browser or service worker
    Given a guardian report link is opened in the browser
    When the service worker intercepts the request
    Then the response is fetched from the network (cache-busted)
    And the response is NOT stored in the service worker cache

  Scenario: TC-GRD-09 Report is bilingual (English and Arabic)
    Given the guardian opens a valid report link
    When the guardian toggles the language to Arabic
    Then all report labels and UI text switch to Arabic
    And student data values remain unchanged
