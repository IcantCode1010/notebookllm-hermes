# API Contracts

## `POST /api/retrieve`

Request:

```json
{
  "question": "What powers the yellow hydraulic system?",
  "storeIds": ["store-a320"],
  "topK": 5
}
```

Response:

```json
{
  "groups": [
    {
      "storeId": "store-a320",
      "aircraftCode": "A320",
      "items": []
    }
  ]
}
```

## `POST /api/chat`

Request:

```json
{
  "question": "What powers the yellow hydraulic system?",
  "storeIds": ["store-a320"]
}
```

Response:

```json
{
  "answer": "Grounded answer text.",
  "citations": [
    {
      "id": "ev-a320-yellow-hyd",
      "label": "A320 FCOM - Hydraulics, p. 42",
      "target": {
        "documentId": "doc-a320-fcom",
        "pageNumber": 42
      }
    }
  ],
  "groups": []
}
```

## `GET /api/stores`

Returns active aircraft stores visible to the current user.

## `GET /api/documents?storeId=store-a320`

Returns published documents for a selected aircraft store.
