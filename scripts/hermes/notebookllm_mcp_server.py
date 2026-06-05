#!/usr/bin/env python3
"""NotebookLLM Hermes MCP adapter.

This stdio MCP server exposes a narrow, read-only tool surface to Hermes and
forwards each call to the local NotebookLLM gateway. It intentionally does not
expose raw Elasticsearch, RAGFlow, Docker, filesystem, or shell access.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

from mcp.server.fastmcp import FastMCP


DEFAULT_GATEWAY_URL = "http://100.99.248.116:3000/api/gateway/tools"
DEFAULT_TIMEOUT_SECONDS = 45

mcp = FastMCP(
    "notebookllm",
    instructions=(
        "Read-only NotebookLLM aviation retrieval tools. Use these tools to "
        "search approved aircraft stores and preserve document/page citation "
        "metadata. Do not use these tools for document mutation or arbitrary "
        "database access."
    ),
)


def _gateway_url() -> str:
    return (
        os.getenv("HERMES_NOTEBOOKLLM_GATEWAY_URL")
        or os.getenv("HERMES_GATEWAY_URL")
        or DEFAULT_GATEWAY_URL
    )


def _gateway_token() -> str:
    token = os.getenv("HERMES_GATEWAY_TOKEN", "").strip()
    if not token:
        raise RuntimeError("HERMES_GATEWAY_TOKEN is not configured for NotebookLLM MCP.")
    return token


def _gateway_timeout() -> int:
    raw = os.getenv("HERMES_NOTEBOOKLLM_GATEWAY_TIMEOUT", "").strip()
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS

    try:
        timeout = int(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS

    return max(5, min(timeout, 180))


def _call_gateway(tool: str, arguments: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        _gateway_url(),
        data=json.dumps({"tool": tool, "arguments": arguments}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {_gateway_token()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=_gateway_timeout()) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"NotebookLLM gateway returned HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"NotebookLLM gateway is unreachable: {exc.reason}") from exc

    if not isinstance(body, dict):
        raise RuntimeError("NotebookLLM gateway returned a non-object response.")

    if "result" in body and isinstance(body["result"], dict):
        return body["result"]

    return body


@mcp.tool(name="searchHybridEvidence")
def search_hybrid_evidence(query: str, storeIds: list[str] | None = None, topK: int = 5) -> dict[str, Any]:
    """Search approved aircraft source evidence with normalized citation metadata.

    Args:
        query: User question or retrieval query.
        storeIds: Approved NotebookLLM aircraft store IDs, such as ["store-b737ng"].
        topK: Maximum number of evidence chunks to return. Keep this between 3 and 8 for normal answers.
    """

    bounded_top_k = max(1, min(int(topK or 5), 10))
    return _call_gateway(
        "searchHybridEvidence",
        {
            "query": query,
            "storeIds": storeIds or ["store-b737ng"],
            "topK": bounded_top_k,
        },
    )


@mcp.tool(name="openSourceTarget")
def open_source_target(
    documentId: str,
    pageNumber: int | None = None,
    imageId: str | None = None,
) -> dict[str, Any]:
    """Resolve a NotebookLLM source target for viewer navigation.

    Args:
        documentId: Normalized NotebookLLM/RAGFlow document ID.
        pageNumber: Optional PDF page number to open.
        imageId: Optional source image/chunk ID.
    """

    arguments: dict[str, Any] = {"documentId": documentId}
    if pageNumber is not None:
        arguments["pageNumber"] = int(pageNumber)
    if imageId:
        arguments["imageId"] = imageId

    return _call_gateway("openSourceTarget", arguments)


if __name__ == "__main__":
    mcp.run()
