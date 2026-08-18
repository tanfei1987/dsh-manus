> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# usage.availableCredits

> Returns the credit balance and refresh information for the API key's caller. For an API key that belongs to a team sub-account, the team's shared pool balance is returned; for a personal account, the personal balance is returned.

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **Auth:** API Key only — not available with OAuth tokens. The caller's identity is derived entirely from the API key, so the request takes no parameters.
</Tip>

<Tip>
  **Scope:** For an API key that belongs to a team sub-account, the response reflects the team's shared credit pool. For a personal account, it reflects the personal balance.
</Tip>

<Tip>
  **`total_credits` is authoritative:** Treat `total_credits` as the single source of truth for spendable balance. Other fields break down where the credits come from but do not always sum to `total_credits` — when the membership has lapsed, `periodic_credits` and `addon_credits` are excluded from the total even though `addon_credits` still reports its real (non-zero) balance.
</Tip>

<Tip>
  **Quota vs. balance:** `pro_monthly_credits` and `max_refresh_credits` describe how much *will* be issued; `periodic_credits` and `refresh_credits` are how much currently *remains*.
</Tip>

<Note>
  **Personal accounts only:** `max_refresh_credits`, `next_refresh_time`, and `refresh_interval` are populated only for personal accounts. Team accounts have no daily/weekly refresh, so these return `0` / `0` / `""`. Time fields are Unix timestamps in **seconds** (UTC), not milliseconds.
</Note>


## OpenAPI

````yaml GET /v2/usage.availableCredits
openapi: 3.1.0
info:
  title: Manus OpenAPI v2
  description: >-
    API for integrating Manus into your workflow. All responses are wrapped with
    {"ok": true, "request_id": "...", ...} for success and {"ok": false,
    "request_id": "...", "error": {"code": "...", "message": "..."}} for errors.
  version: 2.0.0
servers:
  - url: https://api.manus.ai
security:
  - ApiKeyAuth: []
paths:
  /v2/usage.availableCredits:
    get:
      summary: GetAvailableCredits
      description: >-
        Returns the credit balance and refresh information for the API key's
        caller. For an API key that belongs to a team sub-account, the team's
        shared pool balance is returned; for a personal account, the personal
        balance is returned.
      operationId: openapi.v2.OpenapiV2Service.GetAvailableCredits
      parameters:
        - name: x-manus-api-key
          in: header
          required: true
          schema:
            type: string
          description: >-
            API key for authentication. This endpoint does not support OAuth2
            tokens. See
            [Authentication](https://open.manus.ai/docs/v2/authentication).
      responses:
        '200':
          description: Available credits retrieved successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                    example: true
                    description: Whether the request was successful.
                  request_id:
                    type: string
                    description: Unique identifier for this API request.
                  data:
                    $ref: '#/components/schemas/AvailableCredits'
        4XX:
          description: Error response.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security: []
components:
  schemas:
    AvailableCredits:
      type: object
      description: >-
        Credit balance and refresh information for the API key's caller. All
        credit fields are 32-bit integers in credit points. `total_credits` is
        the authoritative spendable balance — see the field descriptions for how
        it is composed.
      properties:
        total_credits:
          type: integer
          description: >-
            Total available credits — the actual spendable wallet balance.
            Equals `free_credits + periodic_credits + addon_credits +
            event_credits + refresh_credits`, minus team overflow credits, where
            `periodic_credits` and `addon_credits` are counted as 0 when the
            membership has lapsed and `event_credits` is 0 when no event is
            active. Always treat this as the single authoritative value for how
            many credits can be spent.
        free_credits:
          type: integer
          description: >-
            Free credits unrelated to any subscription, such as sign-up gifts
            and system grants.
        periodic_credits:
          type: integer
          description: >-
            Remaining periodic subscription credits issued in the current
            billing cycle and not yet spent. Returns 0 when the membership has
            lapsed.
        addon_credits:
          type: integer
          description: >-
            Remaining add-on / credit-pack credits that were purchased
            separately and do not reset with the subscription cycle. In team
            scenarios this already accounts for deducted-but-unpaid overflow
            credits.
        pro_monthly_credits:
          type: integer
          description: >-
            VIP monthly periodic-credit quota — how many periodic credits the
            current membership tier issues each month. This is a quota, not a
            current balance. 0 for non-VIP accounts.
        event_credits:
          type: integer
          description: >-
            Remaining event (live event) credits. Returns the real value only
            while the account's bound campaign is still active; otherwise 0.
        refresh_credits:
          type: integer
          description: >-
            Remaining auto-refresh credits accumulated on the account
            (daily/weekly) and not yet spent.
        max_refresh_credits:
          type: integer
          description: >-
            Amount granted by a single refresh — the cap the next auto-refresh
            will issue. Only present for personal accounts; 0 for team accounts.
        next_refresh_time:
          type: integer
          description: >-
            Time of the next refresh as a Unix timestamp in seconds (UTC). Only
            present for personal accounts; 0 when there is no upcoming refresh.
        refresh_interval:
          type: string
          description: >-
            Refresh cadence: `daily` or `weekly`. Empty string when there is no
            refresh schedule (e.g., team accounts).
          enum:
            - daily
            - weekly
            - ''
    ErrorResponse:
      type: object
      description: Standard error response format returned when a request fails.
      properties:
        ok:
          type: boolean
          example: false
          description: Always false for error responses.
        request_id:
          type: string
          description: >-
            Unique identifier for this API request, useful for debugging with
            support.
        error:
          type: object
          description: Error details.
          properties:
            code:
              type: string
              description: >-
                Machine-readable error code (e.g., "invalid_argument",
                "not_found", "permission_denied", "rate_limited").
            message:
              type: string
              description: Human-readable error description explaining what went wrong.
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-manus-api-key

````