"use strict";

function createDialogflowTextResponse(text) {
  return {
    fulfillmentText: text,
    fulfillmentMessages: [
      {
        text: {
          text: [text],
        },
      },
    ],
  };
}

function getIntentName(body) {
  return body?.queryResult?.intent?.displayName || "";
}

function extractTicketDetails(body) {
  const queryResult = body?.queryResult || {};
  const outputContexts = Array.isArray(queryResult.outputContexts)
    ? queryResult.outputContexts
    : [];

  const mergedParameters = outputContexts.reduce((parameters, context) => {
    return Object.assign(parameters, context?.parameters || {});
  }, { ...queryResult.parameters });

  return {
    email: mergedParameters["email.original"] || mergedParameters.email || "",
    category: mergedParameters.category || "",
  };
}

function assertBigQueryIdentifier(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${label} must be a valid BigQuery identifier.`);
  }
}

function buildPredictionQuery({ projectId, dataset, model }) {
  assertBigQueryIdentifier(dataset, "HELPDESK_DATASET");
  assertBigQueryIdentifier(model, "HELPDESK_MODEL");

  return `WITH pred_table AS (
  SELECT
    5 AS seniority,
    "3-Advanced" AS experience,
    @category AS category,
    "Request" AS type
)
SELECT CAST(predicted_label AS INT64) AS predicted_label
FROM ML.PREDICT(MODEL \`${projectId}.${dataset}.${model}\`, TABLE pred_table)`;
}

function buildTicketConfirmation(email, etaDays) {
  const unit = etaDays === 1 ? "day" : "days";
  return `${email}, your ticket has been created. Someone will contact you shortly. The estimated response time is ${etaDays} ${unit}.`;
}

module.exports = {
  buildPredictionQuery,
  buildTicketConfirmation,
  createDialogflowTextResponse,
  extractTicketDetails,
  getIntentName,
};
