Feature: Announcements Management and Feed Delivery (AG-74)
  As a QA Engineer for the Mutqin English Platform
  I want to verify announcement publication, deletion, role restrictions, and empty states
  So that students receive timely updates from Mr. Adel without unauthorized tampering

  Background:
    Given the Mutqin English platform is operational
    And the announcements service is initialized

  Scenario: Admin creates a new announcement successfully
    Given the user is logged in as "admin"
    When they navigate to "/admin/announcements"
    And create an announcement with title "Thanawya Revision Schedule" and body "Live sessions begin Friday at 7 PM Cairo time"
    Then the new notice appears at the top of the announcements list with status "sent" or "scheduled"
    And students visiting the public announcements view can see the notice

  Scenario: Unauthorized users (students/guests) cannot publish or delete announcements
    Given the user is logged in as "student"
    When they send a POST or DELETE request to the announcements endpoint
    Then the system rejects the operation with HTTP 403 Forbidden
    And no announcement records are modified

  @defect_ag91
  Scenario: Friendly empty state displayed when no announcements exist
    Given the announcements repository contains zero active notices
    When a student visits the announcements page at "/announcements"
    Then a friendly empty-state illustration and localized message "No announcements yet" are rendered
    And no broken layout or unhandled exceptions occur
    # Note: Public route /announcements is missing from app.routes.ts; students receive 404 NotFoundPage (Defect AG-91)

  @responsive @cross_browser
  Scenario: Announcements page renders responsively on 360px mobile screen
    Given an announcement exists with bilingual title and content
    When viewing the announcements feed on a mobile device with 360px viewport width
    Then notice cards fit within the screen bounds without horizontal scrolling
    And action buttons and text wrap gracefully
