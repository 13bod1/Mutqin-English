@security @content-protection @sprint3
Feature: Session Protection and Anti-Recording Hardening (AG-94)
  As the platform owner and content creator (Mr. Adel Mostafa)
  I want to protect lectures and live classes from unauthorized downloading, recording, and account sharing
  So that academic intellectual property is safeguarded and leaks are traceable

  Background:
    Given a signed-in student account "Nour Saeed" with ID "u1"
    And an active enrolled lecture "Vocabulary Demystified"

  @positive @link-signing
  Scenario: Student accesses lecture through valid signed short-lived link
    When the student requests the lecture video stream
    Then the system generates a video URL signed with the student's ID and a 10-minute expiry
    And the video player validates the signature with status 200 OK
    And the dynamic moving watermark displays "ID: u1 (Nour Saeed) • 010****5678"

  @negative @link-tampering
  Scenario: Student attempts to access video with expired or mismatched link
    Given an expired video link token
    When the student tries to play the stream
    Then the platform returns HTTP 403 Forbidden
    And playback is blocked with an expiration warning

  @security @concurrent-viewing
  Scenario: Account sharing across multiple devices is blocked immediately
    Given student "u1" is actively watching a session on Device A
    When the same student account "u1" starts viewing on Device B
    Then Device B becomes the active session
    And Device A stream is stopped immediately
    And a security flag is logged: "Concurrent viewing session attempt"

  @ui @player-hardening
  Scenario: Video player disables download and pauses on tab hide
    When the student plays the video
    Then right-click context menu is disabled
    And picture-in-picture is disabled
    And browser download controls are hidden
    When the user switches tabs or hides the browser window
    Then the video playback is automatically paused and blurred
