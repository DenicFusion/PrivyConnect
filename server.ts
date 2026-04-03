import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cron from "node-cron";
import crypto from "crypto";
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
  
  // Robust CORS configuration
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature', 'x-korapay-signature'],
    credentials: true
  }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Use raw body for webhook signature verification
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Ping endpoint for connectivity testing
  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok", message: "Backend is reachable", timestamp: new Date().toISOString() });
  });

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

  // Debug API route
  app.get("/api/debug-config", (req, res) => {
    res.json({
      supabaseUrl: process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL.substring(0, 15)}...` : 'MISSING',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasPaystackKey: !!process.env.PAYSTACK_SECRET_KEY,
      hasKorapayKey: !!process.env.KORAPAY_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // Test DB connection endpoint
  app.get("/api/test-db", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from("profiles").select("count").limit(1);
      if (error) throw error;
      res.json({ status: "ok", message: "Supabase Admin connected successfully", count: data.length });
    } catch (error: any) {
      console.error("DB Test Error:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // Initiate Subscription API route
  app.post("/api/initiate-subscription", async (req, res) => {
    const { email, amount, plan, user_id, interval } = req.body;
    
    if (!email || !amount || !plan || !user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email,
          amount: amount * 100, // Convert to kobo
          plan,
          callback_url: `${req.headers.origin || "https://yourapp.com"}/verify-subscription`,
          channels: ["card"], // Force card payments only
          metadata: {
            user_id,
            type: "subscription",
            interval: interval || 'monthly'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.status(200).json(response.data);
    } catch (error: any) {
      console.error("Initialization failed:", error.response?.data || error.message);
      return res.status(500).json({ error: "Initialization failed" });
    }
  });

  // Verify Subscription API route
  app.get("/api/verify-subscription", async (req, res) => {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ error: "Reference is required" });
    }

    try {
      const verifyRes = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const data = verifyRes.data;

      if (data.data.status === "success") {
        return res.status(200).json({
          success: true,
          message: "Subscription activated",
          data: data.data
        });
      }

      return res.status(400).json({ success: false, message: "Verification failed" });
    } catch (error: any) {
      console.error("Verification failed:", error.response?.data || error.message);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  // Paystack Webhook Endpoint
  app.post("/api/webhook/paystack", async (req: any, res) => {
    const signature = req.headers["x-paystack-signature"];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!signature || !secret) {
      console.error("Paystack Webhook: Missing signature or secret key");
      return res.status(400).send("Unauthorized");
    }

    // Verify signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("Paystack Webhook: Invalid signature");
      return res.status(400).send("Unauthorized");
    }

    const event = req.body;
    console.log(`Paystack Webhook Event: ${event.event}`);

    if (event.event === "charge.success") {
      const { reference, amount, customer, metadata } = event.data;
      const userId = metadata?.user_id;

      if (!userId) {
        console.error("Paystack Webhook: Missing user_id in metadata");
        return res.status(200).send("OK"); // Still send OK to Paystack
      }

      try {
        // 1. Verify transaction with Paystack API (Double check)
        const verifyResponse = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${secret}`,
            },
          }
        );

        const paymentData = verifyResponse.data.data;

        if (paymentData.status !== "success") {
          console.error(`Paystack Webhook: Transaction ${reference} not successful in verification`);
          return res.status(200).send("OK");
        }

        // 2. Check if transaction already processed (Idempotency)
        const { data: existingTx, error: checkError } = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("reference", reference)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingTx) {
          console.log(`Paystack Webhook: Transaction ${reference} already processed`);
          return res.status(200).send("OK");
        }

        // 3. Process the payment
        const paidAmount = paymentData.amount / 100; // Convert kobo to Naira
        const type = metadata?.type || "topup";

        console.log(`Processing ${type} for user ${userId} with amount ${paidAmount}`);

        if (type === "subscription") {
          const expiryDate = new Date();
          const interval = metadata?.interval || 'monthly';
          
          if (interval === 'hourly') {
            expiryDate.setHours(expiryDate.getHours() + 1);
          } else if (interval === 'daily') {
            expiryDate.setDate(expiryDate.getDate() + 1);
          } else if (interval === 'weekly') {
            expiryDate.setDate(expiryDate.getDate() + 7);
          } else if (interval === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else if (interval === 'quarterly') {
            expiryDate.setMonth(expiryDate.getMonth() + 3);
          } else if (interval === 'biannually') {
            expiryDate.setMonth(expiryDate.getMonth() + 6);
          } else if (interval === 'annually') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1); // Default to monthly
          }

          const authCode = paymentData.authorization?.authorization_code;
          
          // Update profile
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
              is_subscribed: true,
              subscription_status: "active",
              subscription_expiry: expiryDate.toISOString(),
              authorization_code: authCode || null,
              next_billing_date: expiryDate.toISOString(),
            })
            .eq("id", userId);

          if (profileError) throw profileError;
        } else {
          // Top-up wallet
          // We use a transaction or just update the wallet table
          const { data: wallet, error: walletFetchError } = await supabaseAdmin
            .from("wallet")
            .select("balance")
            .eq("profile_id", userId)
            .single();

          if (walletFetchError) throw walletFetchError;

          const newBalance = parseFloat(wallet.balance.toString()) + paidAmount;

          const { error: walletUpdateError } = await supabaseAdmin
            .from("wallet")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("profile_id", userId);

          if (walletUpdateError) throw walletUpdateError;
        }

        // 4. Log transaction
        const { error: txError } = await supabaseAdmin.from("transactions").insert({
          profile_id: userId,
          amount: paidAmount,
          type: type === "subscription" ? "subscription" : "deposit",
          status: "completed",
          reference: reference,
          description: `${type === 'subscription' ? 'Subscription' : 'Wallet top-up'} via Paystack`,
          metadata: { ...metadata, gateway: "paystack" }
        });

        if (txError) throw txError;

        console.log(`Paystack Webhook: Successfully processed ${reference} for user ${userId}`);

        // Send email
        if (customer.email) {
          try {
            await sendEmail({
              to: customer.email,
              subject: type === "subscription" ? "Subscription Confirmed! 💎" : "Wallet Funded 💰",
              type: type === "subscription" ? "subscription_success" : "wallet_funded",
              data: type === "subscription" 
                ? { plan: "Weekly Subscription", expiryDate: new Date().toDateString() }
                : { amount: `₦${paidAmount}` },
            });
          } catch (e) {
            console.error("Email sending failed:", e);
          }
        }

      } catch (error: any) {
        console.error(`Paystack Webhook Processing Error: ${error.message}`);
        return res.status(500).send("Internal Server Error");
      }
    } else if (event.event === "invoice.update") {
      if (event.data.status === "success") {
        const { customer, subscription, amount } = event.data;
        const customerEmail = customer.email;
        
        try {
          // Find user by email
          const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();
            
          if (profile && !profileError) {
            const nextBillingDate = new Date(subscription.next_payment_date);
            
            // Update subscription
            await supabaseAdmin
              .from("profiles")
              .update({
                is_subscribed: true,
                subscription_status: "active",
                subscription_expiry: nextBillingDate.toISOString(),
                next_billing_date: nextBillingDate.toISOString(),
              })
              .eq("id", profile.id);
              
            // Log transaction
            await supabaseAdmin.from("transactions").insert({
              profile_id: profile.id,
              amount: amount / 100,
              type: "subscription",
              status: "completed",
              reference: `auto_renew_${event.data.id}`,
              description: "Subscription Auto-Renewal via Paystack",
              metadata: { gateway: "paystack", invoice_id: event.data.id }
            });
            
            console.log(`Subscription renewed for user ${profile.id}`);
          }
        } catch (err) {
          console.error("Error processing invoice.update:", err);
        }
      }
    }

    res.status(200).send("OK");
  });

  // Payment Success API route (Follows the "Master Fix" logic)
  app.post("/api/payment-success", async (req, res) => {
    const { reference, user_id, type } = req.body;

    console.log(`Payment Success Callback: Ref: ${reference} | Type: ${type} | User: ${user_id}`);

    if (!reference || !user_id || !type) {
      console.error("Missing required fields in payment-success callback:", req.body);
      return res.status(400).json({ error: "Missing required payment details (reference, user_id, type)" });
    }

    try {
      // 1. Verify payment with Paystack
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        console.error("CRITICAL: PAYSTACK_SECRET_KEY is missing.");
        return res.status(500).json({ error: "Server configuration error" });
      }

      console.log(`Verifying Paystack ref: ${reference}...`);
      const verifyResponse = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
          timeout: 10000,
        }
      );

      const data = verifyResponse.data;
      
      if (!data.status || data.data.status !== "success") {
        console.error(`Payment not verified for ref: ${reference}`);
        return res.status(400).json({ success: false, message: "Payment not verified" });
      }

      const amount = data.data.amount / 100; // convert from kobo
      console.log(`Payment verified: ₦${amount} for user ${user_id}`);

      // 2. Prevent duplicate transactions (Idempotency)
      const { data: existingTx, error: checkError } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingTx) {
        console.log(`Transaction ${reference} already processed`);
        return res.status(200).json({ success: true, message: "Already processed" });
      }

      // 3. Save Transaction
      const { error: txError } = await supabaseAdmin.from("transactions").insert([
        {
          user_id,
          amount,
          reference,
          status: "success",
          type,
        },
      ]);

      if (txError) {
        console.error("Error saving transaction:", txError);
        // Fallback to profile_id if user_id column doesn't exist
        if (txError.message?.includes('column "user_id"')) {
          await supabaseAdmin.from("transactions").insert([{
            profile_id: user_id,
            amount,
            reference,
            status: "success",
            type,
          }]);
        } else {
          throw txError;
        }
      }

      // 4. Update Wallet OR Subscription
      if (type === "deposit" || type === "topup") {
        console.log(`Updating wallet for user ${user_id} by +₦${amount}...`);
        const { error: rpcError } = await supabaseAdmin.rpc("increment_wallet", {
          user_id_input: user_id,
          amount_input: amount,
        });

        if (rpcError) {
          console.error("RPC increment_wallet failed, falling back to manual update:", rpcError);
          const { data: wallet } = await supabaseAdmin.from("wallet").select("balance").eq("profile_id", user_id).single();
          if (wallet) {
            const newBalance = (parseFloat(wallet.balance) || 0) + amount;
            await supabaseAdmin.from("wallet").update({ balance: newBalance }).eq("profile_id", user_id);
          } else {
            // Try user_id column
            const { data: wallet2 } = await supabaseAdmin.from("wallet").select("balance").eq("user_id", user_id).single();
            if (wallet2) {
              const newBalance = (parseFloat(wallet2.balance) || 0) + amount;
              await supabaseAdmin.from("wallet").update({ balance: newBalance }).eq("user_id", user_id);
            }
          }
        }
      }

      if (type === "subscription") {
        console.log(`Activating subscription for user ${user_id}...`);
        const { error: subError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "active",
            is_subscribed: true,
            subscription_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq("id", user_id);

        if (subError) throw subError;
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and updated",
      });

    } catch (error: any) {
      console.error("ERROR in payment-success:", error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  });

  // Subscription Expiry Cron Job (Runs daily at midnight)
  cron.schedule("0 0 * * *", async () => {
    console.log("Running subscription expiry check...");
    try {
      const { data: expiredProfiles, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, username")
        .eq("subscription_status", "active")
        .lt("subscription_expiry", new Date().toISOString());

      if (error) throw error;

      if (expiredProfiles && expiredProfiles.length > 0) {
        for (const profile of expiredProfiles) {
          // 1. Update profile status
          await supabaseAdmin
            .from("profiles")
            .update({ is_subscribed: false, subscription_status: "expired" })
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
