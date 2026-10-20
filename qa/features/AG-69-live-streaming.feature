# language: en
@Sprint2 @PBI-13 @AG-69
Feature: Live Streaming Page Access Control & Lifecycle
  As Mr. Adel Mostafa
  I want a live page where I can schedule, start, and end live video broadcasts
  So that students can watch live revision sessions seamlessly

  Background:
    Given an active scheduled session exists for Thanawya Amma cohort

  Scenario: Unauthorized student cannot view stream or stream link
    Given a student who has not purchased or enrolled in the cohort
    When the student opens the live streaming page
    Then access is denied with a clear permission prompt
    And the unlisted stream URL is masked and never exposed in DOM or network payload

  Scenario: Authorized student receives live stream link
    Given an enrolled student with verified access opens the live streaming page
    When the session is live
    Then the embedded player loads the unlisted stream URL
    And playback is enabled

  Scenario: Cairo timezone countdown precision
    Given a scheduled session set for 19:00 Cairo Time tomorrow
    When any student views the live landing card
    Then the remaining countdown timer is synchronized to Africa/Cairo time
    And indicates days, hours, minutes, and seconds until broadcast

  Scenario: Teacher starts session - reactive update without site reload
    Given students are waiting on the live page observing the countdown
    When Mr. Adel initiates "Start Session" from teacher controls
    Then the session status changes from "scheduled" to "live"
    And all viewing students immediately see the "Live Now" banner without refreshing the browser

  Scenario: Teacher ends session - reactive update without site reload
    Given a broadcast is actively live
    When Mr. Adel triggers "End Session"
    Then the status updates to "ended"
    And an informative end-of-broadcast card is rendered

  Scenario: Responsive mobile 360px viewport compatibility
    When the live page is rendered on a viewport width of 360px
    Then the layout conforms without horizontal scrolling
    And all controls and countdown elements remain fully legible
