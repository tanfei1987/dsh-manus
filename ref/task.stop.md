> ## Documentation Index
> Fetch the complete documentation index at: https://open.manus.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# task.stop

> Stops a running task. The task status will change to `stopped`. A stopped task can still be resumed with [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage).

<sup>Questions or issues? Contact us at [api-support@manus.ai](mailto:api-support@manus.ai).</sup>

<Tip>
  **OAuth scope:** `create_task` or `manage_all_tasks` — see the [Open App](https://open.manus.ai/docs/v2/open-app) guide. With `create_task` scope, can only access tasks created by this Open App.
</Tip>

<Tip>
  **Resumable:** A stopped task can still be resumed by sending a new message via [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage).
</Tip>


## OpenAPI

````yaml POST /v2/task.stop
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
  /v2/task.stop:
    post:
      summary: StopTask
      description: >-
        Stops a running task. The task status will change to `stopped`. A
        stopped task can still be resumed with
        [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage).
      operationId: openapi.v2.OpenapiV2Service.StopTask
      parameters:
        - name: x-manus-api-key
          in: header
          required: false
          schema:
            type: string
          description: >-
            API key for direct authentication. Provide either this or
            `Authorization`, not both. See
            [Authentication](https://open.manus.ai/docs/v2/authentication).
        - name: Authorization
          in: header
          required: false
          schema:
            type: string
            example: Bearer {access_token}
          description: >-
            OAuth2 access token in `Bearer {token}` format. Provide either this
            or `x-manus-api-key`, not both. See the [Open
            App](https://open.manus.ai/docs/v2/open-app) guide.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                task_id:
                  type: string
                  description: >-
                    The unique identifier of the running task to stop. Supports
                    the shortcut `agent-default-main_task` for the IM agent's
                    main task.
              required:
                - task_id
      responses:
        '200':
          description: Task stopped successfully.
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
        4XX:
          description: Error response.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
      security: []
components:
  schemas:
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