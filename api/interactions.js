// api/interactions.js
// Discord HTTP Interactions endpoint — required for a "User App" (a Discord app
// installed to a person's account rather than to a server). Discord sends every
// slash-command interaction here as a signed HTTP request; we must verify the
// signature and reply within 3 seconds.

const nacl = require("tweetnacl");
const { getRPDate, formatRPDate, formatRPTime } = require("../lib/rpCalendar.js");

// Vercel-specific: disable automatic body parsing so we can read the RAW body,
// which is required for Ed25519 signature verification (parsing/re-stringifying
// JSON can change the bytes and break the signature check).
module.exports.config = {
  api: {
    bodyParser: false
  }
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifySignature(rawBody, signature, timestamp, publicKeyHex) {
  try {
    const message = Buffer.from(timestamp + rawBody);
    const sig = Buffer.from(signature, "hex");
    const publicKey = Buffer.from(publicKeyHex, "hex");
    return nacl.sign.detached.verify(message, sig, publicKey);
  } catch (err) {
    return false;
  }
}

// Discord interaction type/response type constants
const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    res.status(401).json({ error: "Missing signature headers or public key" });
    return;
  }

  const isValid = verifySignature(rawBody, signature, timestamp, publicKey);
  if (!isValid) {
    res.status(401).json({ error: "Invalid request signature" });
    return;
  }

  const interaction = JSON.parse(rawBody);

  // Discord's required handshake — must reply with PONG or Discord will
  // consider the endpoint broken and revert to no interactions endpoint.
  if (interaction.type === InteractionType.PING) {
    res.status(200).json({ type: InteractionResponseType.PONG });
    return;
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data && interaction.data.name;

    if (commandName === "rpdate") {
      const rp = getRPDate();
      res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: "📅 Current RP Date",
              description: `${formatRPDate(rp)} — ${formatRPTime(rp)} (RP time)`,
              color: 0x5865f2,
              footer: { text: "1 real-world month = 1 RP year" }
            }
          ]
        }
      });
      return;
    }

    res.status(200).json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Unknown command." }
    });
    return;
  }

  res.status(400).json({ error: "Unhandled interaction type" });
};
