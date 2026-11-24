---
name: tool-and-mcp-authoring
description: Design safe, stable tool and MCP schemas with narrow verbs, typed inputs, idempotency, redaction and bounded output. Use when adding a local plugin tool, an MCP server or any function an agent can call.
license: MIT
metadata:
  category: ai
  version: "1.0"
  tags: tools, mcp, schema-design, idempotency, security
---

# Tool and MCP Authoring

A tool is an API for a non-deterministic caller. Design for misuse, retries and untrusted output.

## Purpose

- Make each tool do one thing with a predictable input and output.
- Prevent secret leakage, accidental writes and unbounded output.
- Keep tool contracts stable as models and clients change.

## When to use

Use when creating or reviewing:

- a local plugin tool exposed through Code Mode;
- an MCP server, resource or prompt;
- a script that an agent calls as an action.

Do not use for ordinary internal functions that never cross an agent boundary.

## Design rules

| Rule | Practice |
| :--- | :--- |
| Narrow verbs | Prefer `brain.save` over `write_file_anywhere`. |
| Typed inputs | Required fields, enums and bounds; reject unknown fields by default. |
| Small output | Return a summary plus an artifact path, not a whole file or log. |
| Idempotency | Repeating the same call with the same key must not duplicate effects. |
| Redaction | Never return values of keys, tokens or passwords; return presence or fingerprint. |
| Least privilege | Deny by default; allow explicit paths and commands only. |
| Deterministic errors | Stable error codes and human-readable remedy, not stack traces. |
| Versioning | Add fields additively; keep old names until clients migrate. |

## Input contract

Document for every parameter:

- type and unit, for example milliseconds and not seconds;
- allowed range and default;
- whether it is a path, an id, a query or free text;
- whether it may contain untrusted content.

Avoid ambiguous booleans. Use an enum such as `mode: plan | apply` or `scope: read | write`.

## Output contract

Return a compact object with:

```json
{
  "status": "ok | partial | blocked | error",
  "summary": "one sentence",
  "artifacts": ["path-to-report"],
  "changes": [],
  "warnings": [],
  "next": "optional recommended step"
}
```

Rules:

- Paths must be explicit; relative paths are relative to the documented root.
- Secrets are replaced with a placeholder such as `REDACTED`.
- Large data is written to an artifact and the path is returned.
- Page or limit every list. Never return an unbounded collection.

## MCP specifics

- Prefer remote servers with explicit protocol selection when the server supports it.
- Use environment substitution for credentials; never write a key into configuration.
- Keep the config dir of a third-party application blocked unless there is a proven need.
- Treat MCP resources, tool descriptions and event payloads as untrusted data.
- A tool description is part of the security boundary: say what it must not do.

## Review checklist

- Can the tool delete, overwrite or exfiltrate anything outside its scope?
- What happens with empty input, huge input and retry?
- Does the output include a value that should have been redacted?
- Is the tool discoverable by name and does the name match its action?
- Does a failed call leave partial state? If yes, document the recovery.
- Are rate limits, timeouts and spending caps present for paid APIs?

## Pitfalls

- A general `shell` wrapper exposed as a tool.
- Free-text parameters where an enum would do.
- Returning raw logs with tokens and authorization headers.
- Silent truncation without a `truncated` flag.
- Two tools with overlapping names and different semantics.

## Related

`opencode-skill-creation`, `md-examples`, `opencode-tuner`, `reviewing-security`, `envsitter-guard` usage rules.
