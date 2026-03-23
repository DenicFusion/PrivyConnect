import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cron from "node-cron";
import { supabaseAdmin } from "./server/services/supabaseService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
    // Note: In a real production environment, you would use a service account key.
    // For this environment, we'll assume the default credentials are sufficient or use the project ID.
  });
}

const messaging = getMessaging();

import { sendEmail, EmailType } from "./server/services/emailService.ts";

async function startServer() {
  const app = express();
  app.use(express.json()); // Add JSON parser
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Email API route
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, type, data } = req.body;

    if (!to || !type) {
      return res.status(400).json({ error: "Recipient and email type are required" });
    }

    try {
      const result = await sendEmail({ to, subject, type: type as EmailType, data });
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error in /api/send-email:", error);
      res.status(500).json({ error: "Failed to process email request" });
    }
  });

  // Real-time Chat logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("send_message", (data) => {
      // data: { roomId, senderId, text, type, timestamp }
      io.to(data.roomId).emit("receive_message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Payment Success API route
  app.post("/api/payment-success", async (req, res) => {
    const { reference, type, amount, userId, email, gateway } = req.body;

    if (!reference || !userId) {
      return res.status(400).json({ error: "Reference and User ID are required" });
    }

    try {
      let paymentSuccessful = false;

      if (gateway === 'paystack') {
        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecretKey) {
          console.error("PAYSTACK_SECRET_KEY is missing");
          return res.status(500).json({ error: "Payment verification failed: Server configuration error" });
        }

        const verifyResponse = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
            },
          }
        );

        const paymentData = verifyResponse.data.data;
        if (paymentData.status === "success") {
          paymentSuccessful = true;
        }
      } else {
        // Default to KoraPay
        const korapaySecretKey = process.env.KORAPAY_SECRET_KEY;
        if (!korapaySecretKey) {
          console.error("KORAPAY_SECRET_KEY is missing");
          return res.status(500).json({ error: "Payment verification failed: Server configuration error" });
        }

        const verifyResponse = await axios.get(
          `https://api.korapay.com/merchant/api/v1/charges/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${korapaySecretKey}`,
            },
          }
        );

        const paymentData = verifyResponse.data.data;
        if (paymentData.status === "success") {
          paymentSuccessful = true;
        }
      }

      if (!paymentSuccessful) {
        return res.status(400).json({ error: "Payment not successful" });
      }

      // 2. Update Supabase based on type
      if (type === "topup") {
        // Update balance
        const { data: profile, error: fetchError } = await supabaseAdmin
          .from("profiles")
          .select("balance")
          .eq("id", userId)
          .single();

        if (fetchError) throw fetchError;

        const newBalance = (profile.balance || 0) + parseFloat(amount);

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", userId);

        if (updateError) throw updateError;

        // Log transaction
        await supabaseAdmin.from("transactions").insert({
          from_uid: userId,
          amount: parseFloat(amount),
          type: "deposit",
          status: "completed",
          timestamp: new Date().toISOString(),
          metadata: { gateway, reference, description: `Wallet top-up via ${gateway === 'paystack' ? 'Paystack' : 'KoraPay'}` }
        });

        // Send email
        await sendEmail({
          to: email,
          subject: "Wallet Funded 💰",
          type: "wallet_funded",
          data: { amount: `₦${amount}`, balance: `₦${newBalance}` },
        });

      } else if (type === "subscription") {
        // Update subscription
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_subscribed: true,
            subscription_expiry: expiryDate.toISOString(),
          })
          .eq("id", userId);

        if (updateError) throw updateError;

        // Log transaction
        await supabaseAdmin.from("transactions").insert({
          from_uid: userId,
          amount: 1500,
          type: "payment",
          status: "completed",
          timestamp: new Date().toISOString(),
          metadata: { gateway, reference, description: `Weekly Subscription via ${gateway === 'paystack' ? 'Paystack' : 'KoraPay'}` }
        });

        // Send email
        await sendEmail({
          to: email,
          subject: "Subscription Confirmed! 💎",
          type: "subscription_success",
          data: { plan: "Weekly Subscription", expiryDate: expiryDate.toDateString() },
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error in /api/payment-success:", error);
      res.status(500).json({ error: "Failed to process payment success" });
    }
  });

  // Subscription Expiry Cron Job (Runs daily at midnight)
  cron.schedule("0 0 * * *", async () => {
    console.log("Running subscription expiry check...");
    try {
      const { data: expiredProfiles, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, username")
        .eq("is_subscribed", true)
        .lt("subscription_expiry", new Date().toISOString());

      if (error) throw error;

      if (expiredProfiles && expiredProfiles.length > 0) {
        for (const profile of expiredProfiles) {
          // 1. Update profile status
          await supabaseAdmin
            .from("profiles")
            .update({ is_subscribed: false })
            .eq("id", profile.id);

          // 2. Send expiry email
          if (profile.email) {
            await sendEmail({
              to: profile.email,
              subject: "Your Access Has Expired 🔒",
              type: "subscription_expired",
              data: { username: profile.username },
            });
          }
          console.log(`Subscription expired for user: ${profile.username}`);
        }
      }
    } catch (error) {
      console.error("Error in subscription expiry cron:", error);
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-notification", async (req, res) => {
    const { token, title, body, data } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    try {
      const response = await messaging.send({
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
      });
      res.json({ success: true, messageId: response });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // Vite middleware for development
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
