"use strict";

const { BigQuery } = require("@google-cloud/bigquery");
const logger = require("firebase-functions/logger");
const { defineString, projectID } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const {
  buildPredictionQuery,
  buildTicketConfirmation,
  createDialogflowTextResponse,
  extractTicketDetails,
  getIntentName,
} = require("./src/dialogflow");

const HELPDESK_DATASET = defineString("HELPDESK_DATASET", {
  description: "BigQuery dataset containing the helpdesk prediction model.",
});
const HELPDESK_MODEL = defineString("HELPDESK_MODEL", {
  description: "BigQuery ML model name used to estimate response time.",
});
const BIGQUERY_LOCATION = defineString("BIGQUERY_LOCATION", {
  default: "US",
  description: "BigQuery location for the helpdesk dataset and model.",
});

const bigQueryClient = new BigQuery();

async function predictEtaDays(category) {
  const query = buildPredictionQuery({
    projectId: projectID.value(),
    dataset: HELPDESK_DATASET.value(),
    model: HELPDESK_MODEL.value(),
  });

  const [rows] = await bigQueryClient.query({
    query,
    location: BIGQUERY_LOCATION.value(),
    params: { category },
  });

  const etaDays = Number(rows?.[0]?.predicted_label);
  if (!Number.isFinite(etaDays)) {
    throw new Error("Prediction query returned an invalid predicted_label value.");
  }

  return etaDays;
}

async function resolveIntentResponse(body, predictor = predictEtaDays) {
  const intentName = getIntentName(body);

  switch (intentName) {
    case "Default Welcome Intent":
      return createDialogflowTextResponse(
        "Welcome to the helpdesk assistant. I can create a support ticket for you."
      );
    case "Default Fallback Intent":
      return createDialogflowTextResponse(
        "I didn't understand that. Please try again."
      );
    case "Submit Ticket - Issue Category": {
      const ticket = extractTicketDetails(body);

      if (!ticket.email || !ticket.category) {
        logger.warn("Ticket request was missing required parameters.", {
          hasEmail: Boolean(ticket.email),
          hasCategory: Boolean(ticket.category),
          intentName,
        });

        return createDialogflowTextResponse(
          "I couldn't create the ticket because the email address or issue category is missing. Please try again."
        );
      }

      try {
        const etaDays = await predictor(ticket.category);
        return createDialogflowTextResponse(
          buildTicketConfirmation(ticket.email, etaDays)
        );
      } catch (error) {
        logger.error("Ticket prediction failed.", {
          intentName,
          message: error instanceof Error ? error.message : String(error),
        });

        return createDialogflowTextResponse(
          "I couldn't create your ticket right now. Please try again in a moment."
        );
      }
    }
    default:
      logger.warn("Received an unsupported Dialogflow intent.", {
        intentName,
      });

      return createDialogflowTextResponse(
        "I couldn't process that request. Please try again."
      );
  }
}

exports.dialogflowFirebaseFulfillment = onRequest(
  {
    region: "us-central1",
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed." });
      return;
    }

    if (!request.body || typeof request.body !== "object") {
      response.status(400).json({ error: "Expected a Dialogflow webhook body." });
      return;
    }

    const intentName = getIntentName(request.body);
    logger.info("Received Dialogflow webhook request.", {
      intentName,
      session: request.body.session || null,
    });

    const dialogflowResponse = await resolveIntentResponse(request.body);
    response.status(200).json(dialogflowResponse);
  }
);

module.exports = {
  predictEtaDays,
  resolveIntentResponse,
};
