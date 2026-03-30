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

    console.log(`Payment Success Callback: ${gateway} | Ref: ${reference} | Type: ${type} | User: ${userId}`);

    if (!reference || !userId) {
      console.error("Missing reference or userId in payment-success callback");
      return res.status(400).json({ error: "Reference and User ID are required" });
    }

    try {
      let paymentSuccessful = false;

      if (gateway === 'paystack') {
        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecretKey) {
          console.warn("PAYSTACK_SECRET_KEY is missing. Verification bypassed for testing (INSECURE).");
          paymentSuccessful = true; 
        } else {
          try {
            const verifyResponse = await axios.get(
              `https://api.paystack.co/transaction/verify/${reference}`,
              {
                headers: {
                  Authorization: `Bearer ${paystackSecretKey}`,
                },
              }
            );

            const paymentData = verifyResponse.data.data;
            console.log("Paystack verification response status:", paymentData.status);
            console.log("Paystack amount (kobo):", paymentData.amount);
            
            if (paymentData.status === "success") {
              // Verify amount (Paystack is in kobo)
              const expectedKobo = Math.round(parseFloat(amount) * 100);
              console.log(`Comparing Paystack amount ${paymentData.amount} with expected ${expectedKobo}`);
              
              if (Math.abs(paymentData.amount - expectedKobo) < 100) { // Allow 1 naira difference for rounding
                paymentSuccessful = true;
              } else {
                console.error(`Paystack amount mismatch: Expected ${expectedKobo}, got ${paymentData.amount}`);
                return res.status(400).json({ error: `Amount mismatch. Expected ${expectedKobo} kobo, got ${paymentData.amount} kobo.` });
              }
            } else {
              console.error("Paystack verification failed: Status is not success", paymentData.status);
            }
          } catch (error: any) {
            console.error("Paystack verification API error:", error.response?.data || error.message);
          }
        }
      } else {
        // KoraPay
        const korapaySecretKey = process.env.KORAPAY_SECRET_KEY;
        if (!korapaySecretKey) {
          console.warn("KORAPAY_SECRET_KEY is missing. Verification bypassed for testing (INSECURE).");
          paymentSuccessful = true;
        } else {
          try {
            // KoraPay verification endpoint
            const verifyResponse = await axios.get(
              `https://api.korapay.com/merchant/api/v1/charges/${reference}`,
              {
                headers: {
                  Authorization: `Bearer ${korapaySecretKey}`,
                },
              }
            );

            const paymentData = verifyResponse.data.data;
            console.log("KoraPay verification response status:", paymentData.status);
            console.log("KoraPay amount:", paymentData.amount);

            if (paymentData.status === "success" || paymentData.status === "captured") {
              // KoraPay amount is in Naira (based on user feedback and script usage)
              // But some endpoints might return Kobo, so we check both
              const expectedNaira = parseFloat(amount);
              const expectedKobo = expectedNaira * 100;
              
              console.log(`Comparing KoraPay amount ${paymentData.amount} with expected Naira ${expectedNaira} or Kobo ${expectedKobo}`);
              
              if (Math.abs(paymentData.amount - expectedNaira) < 1 || Math.abs(paymentData.amount - expectedKobo) < 100) {
                paymentSuccessful = true;
              } else {
                console.error(`KoraPay amount mismatch: Expected ${expectedNaira}, got ${paymentData.amount}`);
                return res.status(400).json({ error: `Amount mismatch. Expected ${expectedNaira} Naira, got ${paymentData.amount}.` });
              }
            } else {
              console.error("KoraPay verification failed: Status is not success", paymentData.status);
            }
          } catch (error: any) {
            console.error("KoraPay verification API error:", error.response?.data || error.message);
          }
        }
      }

      if (!paymentSuccessful) {
        console.error(`Payment verification failed for ${gateway} ref: ${reference}`);
        return res.status(400).json({ error: "Payment verification failed or status not successful" });
      }

      console.log(`Payment verified successfully. Updating Supabase for user ${userId}...`);

      // 2. Update Supabase based on type
      if (type === "topup") {
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount)) {
          console.error("Invalid amount for topup:", amount);
          return res.status(400).json({ error: "Invalid amount" });
        }
        
        // Update balance using RPC or direct update
        // We'll fetch first to be safe, but a direct increment would be better if we had an RPC
        const { data: profile, error: fetchError } = await supabaseAdmin
          .from("profiles")
          .select("balance")
          .eq("id", userId)
          .single();

        if (fetchError) {
          console.error("Error fetching profile for balance update:", fetchError);
          throw fetchError;
        }

        const currentBalance = parseFloat(profile.balance?.toString() || "0");
        const newBalance = currentBalance + depositAmount;

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", userId);

        if (updateError) {
          console.error("Error updating profile balance:", updateError);
          throw updateError;
        }

        // Log transaction
        const { error: txError } = await supabaseAdmin.from("transactions").insert({
          profile_id: userId,
          amount: depositAmount,
          type: "deposit",
          status: "completed",
          description: `Wallet top-up via ${gateway === 'paystack' ? 'Paystack' : 'KoraPay'} (Ref: ${reference})`
        });

        if (txError) console.error("Error logging transaction:", txError);

        // Send email
        try {
          await sendEmail({
            to: email,
            subject: "Wallet Funded 💰",
            type: "wallet_funded",
            data: { amount: `₦${depositAmount}`, balance: `₦${newBalance}` },
          });
        } catch (e) {
          console.error("Email sending failed:", e);
        }

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

        if (updateError) {
          console.error("Error updating subscription status:", updateError);
          throw updateError;
        }

        // Log transaction
        const { error: txError } = await supabaseAdmin.from("transactions").insert({
          profile_id: userId,
          amount: 1500,
          type: "payment",
          status: "completed",
          description: `Weekly Subscription via ${gateway === 'paystack' ? 'Paystack' : 'KoraPay'} (Ref: ${reference})`
        });

        if (txError) console.error("Error logging transaction:", txError);

        // Send email
        try {
          await sendEmail({
            to: email,
            subject: "Subscription Confirmed! 💎",
            type: "subscription_success",
            data: { plan: "Weekly Subscription", expiryDate: expiryDate.toDateString() },
          });
        } catch (e) {
          console.error("Email sending failed:", e);
        }
      }

      console.log("Payment processing completed successfully");
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error in /api/payment-success:", error.message || error);
      return res.status(500).json({ error: "Failed to process payment success: " + (error.message || "Unknown error") });
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
