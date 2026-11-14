@pwa @offline @sprint3
Feature: Progressive Web App with Offline Mode and Caching Restrictions (AG-49)
  As a student on mobile or desktop
  I want to install the platform as a PWA and access cached revision materials when offline
  While ensuring that encrypted proprietary video is never cached in offline storage

  Background:
    Given a student browsing the educational platform

  @install @pwa
  Scenario: Student installs the Mr. Adel Mostafa PWA
    When the browser fires the "beforeinstallprompt" event
    Then the platform intercepts the prompt and displays a custom install banner
    When the student taps "Install App"
    Then the native browser install dialog is triggered with the academy name and icon

  @offline @service-worker
  Scenario: App provides clear offline state fallback when internet disconnects
    Given the service worker is active and static shell is cached
    When the student loses internet connection
    Then a prominent offline banner is displayed at the top of the viewport
    And navigating to un-cached pages serves the offline fallback page

  @security @cache-restriction
  Scenario: Proprietary and protected video is strictly excluded from offline cache
    When the student streams or plays a lecture video (.mp4 or .m3u8)
    Then the service worker bypasses cache storage completely
    And protected video bytes are never stored in browser CacheStorage
