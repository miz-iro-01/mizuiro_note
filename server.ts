import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/api/health", (req, res) => res.send("OK"));

  app.use(express.json());

  // --- Threads API Helper ---
  async function postToThreads(userId: string, token: string, text: string, imageUrl?: string) {
    const containerResponse = await axios.post(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      null,
      {
        params: {
          media_type: imageUrl ? "IMAGE" : "TEXT",
          text: text,
          image_url: imageUrl,
          access_token: token,
        },
      }
    );
    const containerId = containerResponse.data.id;
    const publishResponse = await axios.post(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
      null,
      { params: { creation_id: containerId, access_token: token } }
    );
    return publishResponse.data;
  }

  // --- Exchange Code API ---
  app.post("/api/threads/exchange-code", async (req, res) => {
    const { code, clientId, clientSecret, redirectUri } = req.body;
    
    console.log(`[Exchange Code] Starting exchange for clientId: ${clientId?.substring(0, 5)}...`);
    
    try {
      // 1. Exchange code for short-lived token
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', redirectUri);
      params.append('code', code);

      const shortTokenRes = await axios.post('https://graph.threads.net/oauth/access_token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log(`[Exchange Code] Short-lived token obtained`);
      const { access_token, user_id } = shortTokenRes.data;

      // 2. Exchange short-lived token for long-lived token
      const longTokenRes = await axios.get('https://graph.threads.net/access_token', {
        params: {
          grant_type: 'th_exchange_token',
          client_secret: clientSecret,
          access_token: access_token
        }
      });

      const longToken = longTokenRes.data.access_token;
      console.log(`[Exchange Code] Long-lived token obtained`);

      // 3. Get user profile to get account name
      const profileRes = await axios.get(`https://graph.threads.net/v1.0/me`, {
        params: {
          fields: 'id,username,name',
          access_token: longToken
        }
      });

      console.log(`[Exchange Code] Profile obtained: ${profileRes.data.username}`);

      res.json({ 
        success: true, 
        data: {
          threadsToken: longToken,
          threadsUserId: String(user_id || profileRes.data.id),
          accountName: profileRes.data.username || profileRes.data.name || "Threads User"
        }
      });
    } catch (error: any) {
      console.error("[Exchange Code] Error details:", error.response?.data || error.message);
      
      let errorMessage = "連携に失敗しました。";
      if (error.response?.data?.error?.message) {
        errorMessage = `Threads API Error: ${error.response.data.error.message}`;
      } else if (error.response?.data?.error_message) {
        errorMessage = `Threads API Error: ${error.response.data.error_message}`;
      } else if (error.message) {
        errorMessage = `Network Error: ${error.message}`;
      }
      
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // --- Manual Post API ---
  app.post("/api/threads/post", async (req, res) => {
    const { text, threadsUserId, threadsToken } = req.body;
    if (!text || !threadsUserId || !threadsToken) {
      return res.status(400).json({ success: false, error: { message: "Missing required fields" } });
    }

    console.log(`[Manual Post] Posting to Threads for user ${threadsUserId}`);

    try {
      const result = await postToThreads(threadsUserId, threadsToken, text);
      console.log(`[Manual Post] Success:`, result);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("[Manual Post] Error:", error.response?.data || error.message);
      
      let errorMessage = "投稿に失敗しました。";
      if (error.response?.data?.error?.message) {
        errorMessage = `Threads API Error: ${error.response.data.error.message}`;
      } else if (error.message) {
        errorMessage = `Network Error: ${error.message}`;
      }
      
      res.status(500).json({ success: false, error: { message: errorMessage } });
    }
  });

  // --- Vite / Static Files ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
