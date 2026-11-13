@live-streaming @sprint3
Feature: Native Live Streaming Inside the Platform (AG-46)
  As Mr. Adel Mostafa (Teacher)
  I want to broadcast directly from my web browser with sub-10 second latency
  So that all students across Egypt can attend live classes interactively

  Background:
    Given a scheduled live session "Advanced Grammar Revision"
    And 400 enrolled Thanawya Amma students

  @broadcaster @webrtc
  Scenario: Teacher starts in-browser broadcast from studio
    Given the teacher opens the studio page at "/live/live_grammar_1/studio"
    When the teacher clicks "Start Native Broadcast"
    Then the browser captures webcam and microphone
    And the broadcast status changes to "Live"
    And latency is monitored at under 10 seconds on 4G

  @resilience @reconnect
  Scenario: Stream recovers automatically after a network drop
    Given a student watching the live broadcast
    When a temporary 4G mobile network drop occurs
    Then the player displays the "Reconnecting" indicator
    And automatically reconnects within 2 seconds once connection recovers

  @archive @auto-publish
  Scenario: Ending broadcast archives stream into recorded lectures catalog within 30 minutes
    Given an active live broadcast in the studio
    When the teacher clicks "End & Publish as Lecture"
    Then the live session closes
    And a recorded lecture is automatically generated
    And published to the lecture library within 30 minutes
