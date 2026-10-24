Feature: Admin Portal Security, Role-Based Access Control (RBAC), and IDOR Prevention (AG-72)
  As a QA Security Engineer for the Mutqin English Platform
  I want to verify that admin endpoints, financial reports, and user-scoped data are strictly protected
  So that unauthorized students, assistants, or external attackers cannot escalate privileges or access sensitive data

  Background:
    Given the Mutqin English web application is deployed and accessible
    And the user database contains the following test accounts:
      | role      | email                 | userId                               |
      | admin     | admin@mutqin.com      | usr_admin_99                         |
      | assistant | assistant@mutqin.com  | usr_assist_88                        |
      | student   | student@mutqin.com    | usr_stud_77                          |
      | victim    | victim@mutqin.com     | usr_victim_66                        |

  Scenario Outline: Unauthorized roles are blocked from administrative screens (403 Forbidden)
    Given the user is authenticated as "<role>"
    When they attempt to navigate to "<protected_route>"
    Then access is denied with an HTTP 403 status or redirect to unauthorized page
    And no administrative controls or internal state are rendered

    Examples:
      | role      | protected_route      |
      | student   | /admin               |
      | student   | /admin/users         |
      | student   | /admin/settings      |
      | student   | /admin/metrics       |
      | student   | /admin/payments      |
      | assistant | /admin/settings      |
      | assistant | /admin/payments      |

  Scenario: Assistants cannot view total financial revenue in reports or dashboards
    Given the user is authenticated as an "assistant"
    When they access the assistant operational dashboard at "/assistant" or query metrics APIs
    Then the system returns operational KPI metrics such as receipts reviewed and response times
    And the response body and UI strictly omit total platform revenue, gross sales, or profit figures
    And any direct call to "/api/admin/financial-summary" returns HTTP 403 Forbidden

  Scenario: Insecure Direct Object Reference (IDOR) prevention on user profiles
    Given the user is authenticated as "student" with userId "usr_stud_77"
    When they issue a request to view or edit profile data at "/api/users/usr_victim_66"
    Then the server rejects the request with HTTP 403 Forbidden or HTTP 404 Not Found
    And zero personal data belonging to "usr_victim_66" is returned

  Scenario: Insecure Direct Object Reference (IDOR) prevention on payment receipts
    Given the user is authenticated as "student" with userId "usr_stud_77"
    When they attempt to view receipt details at "/checkout/receipt?id=receipt_victim_999"
    Then the system validates ownership of the transaction against the authenticated session
    And the receipt image and reference number belonging to another user are withheld
