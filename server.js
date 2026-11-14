const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const GRAPH_VERSION = process.env.GRAPH_VERSION || "v23.0";

app.get("/", (req, res) => {
  res.send("JARVIS est en ligne !");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  console.log("WEBHOOK REÇU :", JSON.stringify(req.body));

  res.sendStatus(200);

  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== "text") {
      console.log("Aucun message texte à traiter.");
      return;
    }

    console.log("MESSAGE REÇU :", message.text.body);

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: "Tu es JARVIS, un assistant intelligent, utile et amical. Réponds en français.",
      input: message.text.body
    });

    const answer = response.output_text || "Désolé, je n'ai pas pu répondre.";

    console.log("RÉPONSE OPENAI :", answer);

    const result = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.from,
          type: "text",
          text: { body: answer }
        })
      }
    );

    console.log("RÉSULTAT WHATSAPP :", await result.text());

  } catch (error) {
    console.error("ERREUR JARVIS :", error.message);
    console.error("CODE :", error.code);
    console.error("STATUT :", error.status);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("JARVIS démarré sur le port " + PORT);
});
