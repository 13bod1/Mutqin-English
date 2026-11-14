Feature: Theme Customization, Main Page Popup, Cross-Browser and WCAG Accessibility (AG-73)
  As a QA Engineer for the Mutqin English Platform
  I want to verify that site themes apply uniformly, adhere to WCAG AA color contrast, and the admin popup functions reliably
  So that students experience an accessible, branded interface across desktop and mobile devices

  Background:
    Given the Mutqin English platform is running
    And the current user has access to the landing page

  Scenario: Admin updates site theme and changes propagate platform-wide
    Given the admin opens the settings dashboard at "/admin/settings"
    When they select the theme "Oxford Blue" from the approved palette
    And save the settings
    Then the root CSS variables update across the site
    And background, primary button, and navigation header styles reflect the "Oxford Blue" theme palette

  Scenario Outline: Every theme option satisfies WCAG 2.1 AA text contrast ratio
    Given the theme "<theme_name>" is applied
    When evaluating foreground text color against its background container
    Then normal body text achieves at least a 4.5:1 contrast ratio
    And large heading text achieves at least a 3.0:1 contrast ratio

    Examples:
      | theme_name    |
      | Classic Navy  |
      | Oxford Blue   |
      | Warm Sand     |
      | Midnight Dark |

  @defect_ag90
  Scenario: Main page popup displays once when enabled and persists dismissal state
    Given the admin has enabled the main-page popup with title "Exam Revision Sessions"
    When a student visits the landing page at "/"
    Then the announcement modal/banner displays prominently above the fold
    When the student clicks the "Dismiss" button
    Then the popup immediately closes
    And when the student refreshes the landing page within the same session
    Then the popup does not reappear
    # Note: Header notification banner executes dismiss behavior, but dedicated popup modal component on landing page is missing (Defect AG-90)

  Scenario: Main page popup ceases to display when disabled by admin
    Given the admin has toggled the popup setting to disabled ("enabled: false")
    When a student opens the main landing page at "/"
    Then no popup dialog or backdrop is rendered in the DOM

  @cross_browser
  Scenario Outline: Cross-browser and responsive layout compatibility
    Given the platform is viewed on "<browser_or_device>" with viewport width "<viewport_width>"
    When rendering the main page with an active popup
    Then no horizontal scrolling occurs
    And touch targets are at least 44x44px
    And all text remains legible without truncation

    Examples:
      | browser_or_device                       | viewport_width |
      | Chrome Desktop (Chromium 156)           | 1440px         |
      | Firefox Desktop (Firefox 157)           | 1280px         |
      | WebKit Engine (Playwright Win - not OS) | 1024px         |
      | Mobile Android (Viewport 360)           | 360px          |
      | Mobile iPhone (Viewport 390)            | 390px          |
