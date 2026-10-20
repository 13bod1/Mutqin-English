# language: en
@Sprint2 @PBI-11 @AG-70
Feature: Sprint 1 Feature Regression & Brand Identity Verification
  As a visitor and enrolled student
  I want all core learning and gamification features to remain stable
  And the brand name "Mr. Adel Mostafa" to be consistently reflected across the platform

  Scenario: Unauthenticated visitor browsing
    Given a new guest navigates to the platform
    Then the authentication state correctly defaults to unauthenticated
    And recorded preview lectures remain accessible

  Scenario: Thanawya Amma student registration & login
    When a student submits registration details for stage "sec3"
    Then the account is created with appropriate grade classification
    And subsequent login authenticates the user successfully

  Scenario: Recorded lecture library and instructor verification
    When a student visits the lecture library
    Then all published lectures show instructor "Mr. Adel Mostafa" in English and "أ. عادل مصطفى" in Arabic
    And featured revision lectures are available for playback

  Scenario: Quiz grading and dynamic XP allocation
    When a student completes a diagnostic grammar quiz
    Then answers are graded with 100% accuracy calculation
    And bonus XP is calculated and rewarded to their progress profile

  Scenario: National leaderboard sorting
    When the Egyptian student leaderboard is fetched
    Then students are strictly sorted in descending order of cumulative XP

  Scenario: Bilingual brand and page title synchronization
    When switching language between Arabic (RTL) and English (LTR)
    Then the active layout direction updates to "rtl" and "ltr" respectively
    And the browser page titles reflect the official brand name
