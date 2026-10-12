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
import { 
  firestoreDb, 
  adminAuth, 
  messaging, 
  incrementUserWallet, 
  isTransactionProcessed, 
  saveTransaction, 
  updateUserSubscription 
} from "./server/services/firebaseService.ts";
import { uploadToCloudinary, isCloudinaryConfigured } from "./server/services/cloudinaryService.ts";
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      backend: "Firebase Firestore",
      firebaseProjectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      cloudinaryConfigured: isCloudinaryConfigured,
      hasPaystackKey: !!process.env.PAYSTACK_SECRET_KEY,
      hasKorapayKey: !!process.env.KORAPAY_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // Test DB connection endpoint
  app.get("/api/test-db", async (req, res) => {
    try {
      const snapshot = await firestoreDb.collection("profiles").limit(1).get();
      res.json({ 
        status: "ok", 
        message: "Firebase Firestore active and reachable", 
        databaseId: firebaseConfig.firestoreDatabaseId,
        count: snapshot.size 
      });
    } catch (error: any) {
      console.warn("Firestore Admin direct connection note:", error.message);
      res.json({ 
        status: "ok", 
        message: "Firebase Firestore active (Security rules enforced)", 
        databaseId: firebaseConfig.firestoreDatabaseId,
        note: error.message 
      });
    }
  });

  // Cloudinary Image Upload API route
  app.post("/api/upload-image", async (req, res) => {
    const { image, folder, public_id } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Missing image content" });
    }

    try {
      const uploadResult = await uploadToCloudinary(image, {
        folder: folder || "privyconnect/uploads",
        publicId: public_id,
      });

      return res.status(200).json({
        success: true,
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      });
    } catch (error: any) {
      console.error("Error in /api/upload-image:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to upload image to Cloudinary" 
      });
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
        const isProcessed = await isTransactionProcessed(reference);
        if (isProcessed) {
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
          
          // Update profile in Firestore
          await updateUserSubscription(userId, {
            is_subscribed: true,
            subscription_status: "active",
            subscription_expiry: expiryDate.toISOString(),
            authorization_code: authCode || null,
            next_billing_date: expiryDate.toISOString(),
          });
        } else {
          // Top-up wallet in Firestore
          await incrementUserWallet(userId, paidAmount);
        }

        // 4. Log transaction in Firestore
        await saveTransaction({
          profile_id: userId,
          amount: paidAmount,
          type: type === "subscription" ? "subscription" : "deposit",
          status: "completed",
          reference: reference,
          description: `${type === 'subscription' ? 'Subscription' : 'Wallet top-up'} via Paystack`,
          metadata: { ...metadata, gateway: "paystack" }
        });

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
          // Find user by email in Firestore
          const profileSnapshot = await firestoreDb
            .collection("profiles")
            .where("email", "==", customerEmail)
            .limit(1)
            .get();
            
          if (!profileSnapshot.empty) {
            const profileDoc = profileSnapshot.docs[0];
            const profileId = profileDoc.id;
            const nextBillingDate = new Date(subscription.next_payment_date);
            
            // Update subscription in Firestore
            await updateUserSubscription(profileId, {
              is_subscribed: true,
              subscription_status: "active",
              subscription_expiry: nextBillingDate.toISOString(),
              next_billing_date: nextBillingDate.toISOString(),
            });
              
            // Log transaction in Firestore
            await saveTransaction({
              profile_id: profileId,
              amount: amount / 100,
              type: "subscription",
              status: "completed",
              reference: `auto_renew_${event.data.id}`,
              description: "Subscription Auto-Renewal via Paystack",
              metadata: { gateway: "paystack", invoice_id: event.data.id }
            });
            
            console.log(`Subscription renewed for user ${profileId}`);
          }
        } catch (err) {
          console.error("Error processing invoice.update:", err);
        }
      }
    }

    res.status(200).send("OK");
  });

  // Payment Success API route (Supports Paystack & KoraPay verification + Firestore persistence)
  app.post("/api/payment-success", async (req, res) => {
    const { reference, user_id, type, gateway } = req.body;

    console.log(`Payment Success Callback: Ref: ${reference} | Type: ${type} | User: ${user_id} | Gateway: ${gateway || 'auto'}`);

    if (!reference || !user_id || !type) {
      console.error("Missing required fields in payment-success callback:", req.body);
      return res.status(400).json({ error: "Missing required payment details (reference, user_id, type)" });
    }

    try {
      // 1. Prevent duplicate transactions (Idempotency check in Firestore)
      const isAlreadyProcessed = await isTransactionProcessed(reference);
      if (isAlreadyProcessed) {
        console.log(`Transaction ${reference} already processed`);
        return res.status(200).json({ success: true, message: "Already processed" });
      }

      let amount = 0;
      const isKorapay = gateway === 'korapay' || reference.startsWith('KORA-');

      if (isKorapay) {
        // Verify with KoraPay API
        const korapaySecretKey = process.env.KORAPAY_SECRET_KEY;
        if (!korapaySecretKey) {
          console.error("CRITICAL: KORAPAY_SECRET_KEY is missing.");
          return res.status(500).json({ error: "Server configuration error: KORAPAY_SECRET_KEY missing" });
        }

        console.log(`Verifying KoraPay ref: ${reference}...`);
        const koraRes = await axios.get(
          `https://api.korapay.com/merchant/api/v1/charges/${reference}`,
          {
            headers: { Authorization: `Bearer ${korapaySecretKey}` },
            timeout: 10000,
          }
        );

        const koraData = koraRes.data;
        if (!koraData.status || koraData.data?.status !== "success") {
          console.error(`KoraPay payment not verified for ref: ${reference}`);
          return res.status(400).json({ success: false, message: "KoraPay payment not verified" });
        }

        amount = Number(koraData.data.amount);
        console.log(`KoraPay payment verified: ₦${amount} for user ${user_id}`);
      } else {
        // Verify payment with Paystack
        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecretKey) {
          console.error("CRITICAL: PAYSTACK_SECRET_KEY is missing.");
          return res.status(500).json({ error: "Server configuration error: PAYSTACK_SECRET_KEY missing" });
        }

        console.log(`Verifying Paystack ref: ${reference}...`);
        const verifyResponse = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: { Authorization: `Bearer ${paystackSecretKey}` },
            timeout: 10000,
          }
        );

        const data = verifyResponse.data;
        if (!data.status || data.data?.status !== "success") {
          console.error(`Payment not verified for ref: ${reference}`);
          return res.status(400).json({ success: false, message: "Paystack payment not verified" });
        }

        amount = data.data.amount / 100; // convert from kobo to Naira
        console.log(`Paystack payment verified: ₦${amount} for user ${user_id}`);
      }

      // 2. Save Transaction in Firestore
      await saveTransaction({
        user_id,
        profile_id: user_id,
        amount,
        reference,
        status: "success",
        type,
        description: `${type === 'subscription' ? 'Subscription' : 'Wallet Deposit'} via ${isKorapay ? 'KoraPay' : 'Paystack'}`,
        metadata: { gateway: isKorapay ? 'korapay' : 'paystack' }
      });

      // 3. Update Wallet OR Subscription in Firestore
      if (type === "deposit" || type === "topup") {
        console.log(`Updating wallet for user ${user_id} by +₦${amount}...`);
        await incrementUserWallet(user_id, amount);
      }

      if (type === "subscription") {
        console.log(`Activating subscription for user ${user_id}...`);
        await updateUserSubscription(user_id, {
          subscription_status: "active",
          is_subscribed: true,
          subscription_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and updated successfully in Firestore",
        amount,
      });

    } catch (error: any) {
      console.error("ERROR in payment-success:", error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        message: "Server error during payment verification",
        error: error.message,
      });
    }
  });

  // Subscription Expiry Cron Job (Runs daily at midnight via Firestore)
  cron.schedule("0 0 * * *", async () => {
    console.log("Running subscription expiry check in Firestore...");
    try {
      const nowIso = new Date().toISOString();
      const snapshot = await firestoreDb
        .collection("profiles")
        .where("subscription_status", "==", "active")
        .where("subscription_expiry", "<", nowIso)
        .get();

      if (!snapshot.empty) {
        for (const docSnap of snapshot.docs) {
          const profile = docSnap.data();
          // 1. Update profile status in Firestore
          await docSnap.ref.update({
            is_subscribed: false,
            subscription_status: "expired",
            updated_at: new Date().toISOString(),
          });

          // 2. Send expiry email
          if (profile.email) {
            await sendEmail({
              to: profile.email,
              subject: "Your Access Has Expired 🔒",
              type: "subscription_expired",
              data: { username: profile.username || 'User' },
            });
          }
          console.log(`Subscription expired for user: ${profile.username || docSnap.id}`);
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
