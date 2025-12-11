import fetch from "node-fetch";

const CLIENT_ID = process.env.TWITCH_CLIENT_ID || "TWITCH_CLIENT_ID";

export async function fetchChannelPoints(accessToken: string, broadcasterId: string) {
  const resp = await fetch(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": CLIENT_ID,
    },
  });

  if (!resp.ok) {
    throw new Error(`twitch channel points error ${resp.status}`);
  }
  return resp.json();
}

