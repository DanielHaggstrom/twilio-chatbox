# Twilio Chatbox

Twilio Chatbox is a Dialogflow ES helpdesk webhook for Twilio conversations that predicts ticket response time with BigQuery ML.

## Overview

This repository contains the backend webhook used by a simple IT helpdesk chatbot. The conversation flow lives in Dialogflow ES, Twilio is used as the chat channel, and a Firebase HTTPS function calls a BigQuery ML model to estimate the response time for each ticket.

The original assignment assets are still included in the repository:

- `ml-helpdesk-agent.zip`: Dialogflow ES agent export
- `Actividad Twilio - Daniel Häggström.pdf`: original project brief/report

## Architecture

1. A user starts a support conversation through Twilio.
2. Dialogflow ES captures the email and issue category.
3. Dialogflow calls the `dialogflowFirebaseFulfillment` webhook.
4. The Firebase function runs a BigQuery ML prediction.
5. Dialogflow returns the ticket confirmation back to the user.

## Project Layout

- `firebase.json`: Firebase deployment config
- `functions/`: Cloud Functions source code, tests, and package manifest
- `ml-helpdesk-agent.zip`: Dialogflow ES export used to bootstrap the bot

## Requirements

- Node.js 22
- Firebase CLI
- A Firebase project linked to a Google Cloud project
- A BigQuery dataset and ML model accessible by the deployed function

## Configuration

This project uses Firebase parameterized configuration. Set the following values in `functions/.env.<project-id>` or let the Firebase CLI prompt for them during deployment:

```dotenv
HELPDESK_DATASET=helpdesk
HELPDESK_MODEL=prediccio1
BIGQUERY_LOCATION=US
```

The deployed service account needs permission to run BigQuery jobs and read the model or dataset used by the prediction query.

## Local Development

Install dependencies and run tests:

```bash
cd functions
npm install
npm test
```

To emulate the function locally:

```bash
cd functions
firebase emulators:start --only functions --config ../firebase.json
```

## Deployment

1. Select the Firebase project:

```bash
firebase use <project-id>
```

2. Deploy the webhook:

```bash
cd functions
firebase deploy --only functions:dialogflowFirebaseFulfillment --config ../firebase.json
```

3. In Dialogflow ES, point the webhook to the deployed `dialogflowFirebaseFulfillment` endpoint.
4. Restore `ml-helpdesk-agent.zip` if you need to recreate the Dialogflow agent.

## Production Notes

- The webhook now avoids logging full request bodies, which reduces accidental exposure of user data.
- BigQuery identifiers are configured instead of hardcoded.
- The function validates the incoming Dialogflow payload before querying BigQuery.
- The repository now uses a standard Firebase `functions/` layout with tests.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
