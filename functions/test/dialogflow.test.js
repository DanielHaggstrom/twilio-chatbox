"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPredictionQuery,
  buildTicketConfirmation,
  createDialogflowTextResponse,
  extractTicketDetails,
  getIntentName,
} = require("../src/dialogflow");

test("extractTicketDetails reads values from Dialogflow output contexts", () => {
  const result = extractTicketDetails({
    queryResult: {
      outputContexts: [
        {
          parameters: {
            email: "fallback@example.com",
          },
        },
        {
          parameters: {
            "email.original": "user@example.com",
            category: "network",
          },
        },
      ],
    },
  });

  assert.deepEqual(result, {
    email: "user@example.com",
    category: "network",
  });
});

test("extractTicketDetails falls back to top-level parameters", () => {
  const result = extractTicketDetails({
    queryResult: {
      parameters: {
        email: "user@example.com",
        category: "hardware",
      },
    },
  });

  assert.deepEqual(result, {
    email: "user@example.com",
    category: "hardware",
  });
});

test("buildPredictionQuery creates a fully-qualified model reference", () => {
  const query = buildPredictionQuery({
    projectId: "my-project",
    dataset: "helpdesk",
    model: "prediccio1",
  });

  assert.match(query, /my-project\.helpdesk\.prediccio1/);
  assert.match(query, /@category AS category/);
});

test("buildPredictionQuery rejects invalid identifiers", () => {
  assert.throws(
    () =>
      buildPredictionQuery({
        projectId: "my-project",
        dataset: "helpdesk-prod",
        model: "prediccio1",
      }),
    /HELPDESK_DATASET/
  );
});

test("buildTicketConfirmation uses correct grammar for the ETA", () => {
  assert.equal(
    buildTicketConfirmation("user@example.com", 1),
    "user@example.com, your ticket has been created. Someone will contact you shortly. The estimated response time is 1 day."
  );

  assert.equal(
    buildTicketConfirmation("user@example.com", 3),
    "user@example.com, your ticket has been created. Someone will contact you shortly. The estimated response time is 3 days."
  );
});

test("createDialogflowTextResponse returns a valid text payload", () => {
  assert.deepEqual(createDialogflowTextResponse("Hello"), {
    fulfillmentText: "Hello",
    fulfillmentMessages: [
      {
        text: {
          text: ["Hello"],
        },
      },
    ],
  });
});

test("getIntentName returns the Dialogflow intent display name", () => {
  assert.equal(
    getIntentName({
      queryResult: {
        intent: {
          displayName: "Submit Ticket - Issue Category",
        },
      },
    }),
    "Submit Ticket - Issue Category"
  );
});
