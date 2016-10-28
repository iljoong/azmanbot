## Bot API (LUIS)

This bot api is the same version of Bot API except natural language support using LUIS.

It includes sample [luisapp](./luisapp/azmanbot_sample.json). You can import this sample luis app to your luis.ai and integrate to your bot api.

## Build and Test

Update url of luis model in `app.js`

```
npm install

npm start
```

## Deploy to Azure

You need to add following environment variables in Application Settings

* MICROSOFT_APP_ID

* MICROSOFT_APP_PASSWORD

* BILLINGAPIURL - this is url of __usage api__



