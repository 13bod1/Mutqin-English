@AG-72 @Security @RBAC @IDOR
Feature: Admin Portal Security, Role-Based Access Control (RBAC), and IDOR Prevention (AG-72 Retest)
  As a QA Security Engineer for Mutqin English
  I want to verify that admin endpoints, financial reports, and user-scoped data are strictly protected
  So that unauthorized students, assistants, or external callers cannot escalate privileges or access sensitive data

  Background:
    Given the Mutqin English platform backend is running isolated PostgreSQL 16 and PostgREST 16.5
    And the database contains test accounts:
      | role      | identifier | userId                               |
      | student   | studentA   | 11111111-1111-4111-8111-111111111111 |
      | student   | studentB   | 55555555-5555-4555-8555-555555555555 |
      | assistant | assistant  | 22222222-2222-4222-8222-222222222222 |
      | admin     | admin      | 33333333-3333-4333-8333-333333333333 |

  Scenario Outline: Unauthorized roles are denied access to admin-only API RPC endpoints (HTTP 403)
    Given the caller is authenticated as "<role>"
    When they call the admin-only RPC "<rpc_name>"
    Then the server rejects the request with HTTP 403 Forbidden
    And the response body indicates ERRCODE 42501 without leaking internal state

    Examples:
      | role      | rpc_name                 |
      | studentA  | admin_financial_summary  |
      | assistant | admin_financial_summary  |
      | studentA  | issue_guardian_report    |
      | assistant | issue_guardian_report    |

  Scenario: Assistants cannot view total financial revenue in reports or direct APIs
    Given the caller is authenticated as an "assistant"
    When they call "/rpc/admin_financial_summary"
    Then the server returns HTTP 403 Forbidden
    And the response strictly withholds "total_revenue" and financial aggregations
    When they navigate to "/assistant" in the browser UI
    Then the operational portal is rendered
    And total platform revenue, gross sales, and profit figures are strictly absent from the DOM

  Scenario: Insecure Direct Object Reference (IDOR) prevention on push subscriptions (substitutions private userId)
    Given the caller is authenticated as "studentA"
    When they query push subscriptions belonging to "studentB"
    Then the system applies Row Level Security returning HTTP 200 with an empty collection []
    And studentB's private userId and endpoint secrets are strictly withheld
    When the assistant queries push subscriptions
    Then the system applies RLS returning HTTP 200 with an empty collection []

  Scenario: Insecure Direct Object Reference (IDOR) prevention on payment receipts
    Given the caller is authenticated as "studentA"
    When they query payments belonging to "studentB"
    Then the system applies Row Level Security returning HTTP 200 with an empty collection []
    And no transaction details or receipts belonging to "studentB" are returned

  Scenario Outline: Client-side Angular router guards redirect unauthorized roles away from admin routes
    Given the user is authenticated in the browser as "<role>"
    When they navigate to "<target_route>"
    Then the client route guard intercepts navigation
    And the browser is redirected to "<expected_redirect>"
    And no administrative controls, internal tables, or financial revenue are rendered
    Note: Client-side guard navigation redirection does not issue an HTTP 403 status code from the SPA web server.

    Examples:
      | role      | target_route      | expected_redirect |
      | studentA  | /admin            | /                 |
      | studentA  | /admin/payments   | /                 |
      | studentA  | /assistant        | /                 |
      | assistant | /admin            | /assistant        |
      | assistant | /admin/payments   | /assistant        |
      | assistant | /admin/settings   | /assistant        |
      | admin     | /admin            | /admin            |
