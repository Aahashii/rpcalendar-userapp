// api/register-commands.js
// Visit this URL once in your browser (with the correct secret) to register
// the /rpdate slash command with Discord as a User-Installable command.
// You can safely re-visit it any time you want to re-register (e.g. after
// changing the command).

module.exports = async (req, res) => {
  const providedSecret = req.query.secret;
  const expectedSecret = process.env.REGISTER_SECRET;

  if (!expectedSecret) {
    res.status(500).json({ error: "REGISTER_SECRET is not set in your Vercel project environment variables." });
    return;
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    res.status(401).json({ error: "Missing or incorrect ?secret= query parameter." });
    return;
  }

  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_TOKEN;

  if (!appId || !token) {
    res.status(500).json({ error: "DISCORD_APPLICATION_ID or DISCORD_TOKEN is not set." });
    return;
  }

  const commandDefinition = {
    name: "rpdate",
    description: "Show the current in-universe RP date and time",
    type: 1, // CHAT_INPUT (slash command)
    // integration_types: 0 = installable to a server (GUILD_INSTALL)
    //                    1 = installable to a user's account (USER_INSTALL)
    integration_types: [0, 1],
    // contexts: 0 = in a server, 1 = bot DM, 2 = private/group DM
    contexts: [0, 1, 2]
  };

  try {
    const response = await fetch(
      `https://discord.com/api/v10/applications/${appId}/commands`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([commandDefinition])
      }
    );

    const result = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: "Discord API rejected the request", details: result });
      return;
    }

    res.status(200).json({ success: true, registeredCommands: result });
  } catch (err) {
    res.status(500).json({ error: "Request to Discord failed", details: String(err) });
  }
};
