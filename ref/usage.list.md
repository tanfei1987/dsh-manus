> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# usage.list

> Lists the current user's credit change history at session granularity, sorted by change time (newest first).

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **Auth:** API Key only — not available with OAuth tokens.
</Tip>

<Tip>
  **All change types:** Each entry is a credit change at session granularity — consumption, refunds, subscription grants, and admin adjustments. `credits` is signed: negative values are consumption, positive values are refunds or grants. Inspect the `type` field to distinguish categories.
</Tip>


## OpenAPI

````yaml GET /v2/usage.list
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
  /v2/usage.list:
    get:
      summary: ListUsage
      description: >-
        Lists the current user's credit change history at session granularity,
        sorted by change time (newest first).
      operationId: openapi.v2.OpenapiV2Service.ListUsage
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
        - name: limit
          in: query
          schema:
            type: integer
            description: 'Number of records to return per page. Default: 20, Max: 100.'
        - name: cursor
          in: query
          schema:
            type: string
            description: >-
              Pagination cursor from the previous response's next_cursor field.
              Omit for the first page.
      responses:
        '200':
          description: Usage records retrieved successfully.
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
                    type: array
                    items:
                      $ref: '#/components/schemas/UsageRecord'
                    description: Array of credit consumption records, one per task.
                  has_more:
                    type: boolean
                    description: >-
                      Whether there are more records beyond this page. If true,
                      use next_cursor to fetch the next page.
                  next_cursor:
                    type: string
                    description: >-
                      Cursor to pass as the cursor parameter for the next page.
                      Only present when has_more is true.
        4XX:
          description: Error response.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security: []
components:
  schemas:
    UsageRecord:
      type: object
      description: >-
        A credit change record at session granularity. Covers consumption,
        refunds, subscription grants, and admin adjustments.
      properties:
        task_id:
          type: string
          description: The task (session) ID this change is associated with.
        title:
          type: string
          description: >-
            The task title. Returns "Deleted conversation" if the session has
            been deleted.
        credits:
          type: integer
          description: >-
            Credit change amount. Negative values represent consumption;
            positive values represent refunds or subscription/admin grants.
        created_at:
          type: integer
          description: Time of the most recent change as a Unix timestamp in seconds.
        type:
          type: string
          description: >-
            Change type:


            - `cost` — credit consumption (task usage or admin deduction)

            - `refund` — credit returned after consumption (e.g., task failure
            rollback)

            - `grant` — credits gained (subscription grant, upgrade bonus,
            recurring issuance, credit pack purchase, admin compensation)
          enum:
            - cost
            - refund
            - grant
        collaborate_infos:
          type: array
          description: >-
            Per-collaborator credit breakdown for team tasks. Empty for personal
            tasks.
          items:
            type: object
            properties:
              user_id:
                type: string
                description: Collaborator's user ID.
              user_name:
                type: string
                description: Collaborator's display name.
              credits:
                type: integer
                description: Credits attributed to this collaborator for the task.
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