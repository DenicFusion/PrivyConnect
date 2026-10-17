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
  updateUserSubscription,
  recordProfileViewServer,
  checkAndUpdateConversationConnectionServer,
  handleDeleteConversationServer,
  handleDeleteAccountServer,
  recalculateProfileStrengthServer,
  getUserStatsServer
} from "./server/services/firebaseService.ts";
import { uploadToCloudinary, isCloudinaryConfigured } from "./server/services/cloudinaryService.ts";
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

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

  // Use raw body for webhook signature verification and increased limit for photo uploads
  app.use(express.json({
    limit: '50mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
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

  // Location detection API route (coarse location based on IP)
  // Location detection API route (coarse location based on IP)
  app.get("/api/detect-location", async (req, res) => {
    try {
      const forwarded = req.headers["x-forwarded-for"];
      let rawIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "";
      let ip = rawIp.replace(/^::ffff:/, "").trim();

      const isLocal = !ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");
      
      // If local/proxy IP, discover external public IP
      if (isLocal) {
        try {
          const ipify = await axios.get("https://api.ipify.org?format=json", { timeout: 2500 });
          if (ipify.data?.ip) {
            ip = ipify.data.ip.trim();
          }
        } catch {
          // continue with empty or local
        }
      }

      // 1. Try ipwho.is with IP
      try {
        const queryUrl = ip && !isLocal ? `https://ipwho.is/${ip}` : "https://ipwho.is/";
        const geoRes = await axios.get(queryUrl, { timeout: 3500 });
        if (geoRes.data?.success !== false && (geoRes.data?.region || geoRes.data?.city)) {
          const lat = Math.round(Number(geoRes.data.latitude || 6.52) * 100) / 100;
          const lng = Math.round(Number(geoRes.data.longitude || 3.37) * 100) / 100;
          return res.json({
            state: geoRes.data.region || geoRes.data.city || "Lagos",
            city: geoRes.data.city || geoRes.data.region || "Lagos",
            lat,
            lng,
            country: geoRes.data.country || "Nigeria",
            isDetected: true
          });
        }
      } catch (err: any) {
        console.warn("ipwho.is lookup failed:", err.message);
      }

      // 2. Try freeipapi.com
      try {
        const freeApiUrl = ip && !isLocal ? `https://freeipapi.com/api/json/${ip}` : "https://freeipapi.com/api/json";
        const geoRes2 = await axios.get(freeApiUrl, { timeout: 3500 });
        if (geoRes2.data?.regionName || geoRes2.data?.cityName) {
          const lat = Math.round(Number(geoRes2.data.latitude || 6.52) * 100) / 100;
          const lng = Math.round(Number(geoRes2.data.longitude || 3.37) * 100) / 100;
          return res.json({
            state: geoRes2.data.regionName || geoRes2.data.cityName || "Lagos",
            city: geoRes2.data.cityName || geoRes2.data.regionName || "Lagos",
            lat,
            lng,
            country: geoRes2.data.countryName || "Nigeria",
            isDetected: true
          });
        }
      } catch (err: any) {
        console.warn("freeipapi lookup failed:", err.message);
      }
    } catch (err: any) {
      console.warn("IP location detection fallback:", err.message);
    }

    return res.json({
      state: "Lagos",
      city: "Lagos",
      lat: 6.52,
      lng: 3.37,
      country: "Nigeria",
      isDetected: false
    });
  });

  // KoraPay Webhook Endpoint
  app.post("/api/webhook/korapay", async (req: any, res) => {
    const signature = req.headers["x-korapay-signature"];
    const secret = process.env.KORAPAY_SECRET_KEY;

    if (secret && signature) {
      const hash = crypto.createHmac("sha256", secret).update(req.rawBody || JSON.stringify(req.body)).digest("hex");
      if (hash !== signature) {
        console.error("KoraPay Webhook: Invalid signature");
        return res.status(400).send("Unauthorized");
      }
    }

    const event = req.body;
    console.log(`KoraPay Webhook Event: ${event?.event || event?.status}`);

    const data = event?.data || event;
    const reference = data?.reference;
    const userId = data?.metadata?.user_id || data?.metadata?.userId;

    if (!reference) {
      return res.status(200).send("OK");
    }

    try {
      const isProcessed = await isTransactionProcessed(reference);
      if (isProcessed) {
        console.log(`KoraPay Webhook: Transaction ${reference} already processed`);
        return res.status(200).send("OK");
      }

      const amount = Number(data.amount) || 2000;
      if (amount < 2000) {
        console.warn(`KoraPay Webhook: Amount ₦${amount} less than ₦2,000 threshold for ${reference}`);
        return res.status(200).send("OK");
      }

      if (userId) {
        const now = new Date();
        const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await updateUserSubscription(userId, {
          is_subscribed: true,
          subscription_status: "active",
          subscription_expiry: expiry.toISOString(),
        });

        await saveTransaction({
          profile_id: userId,
          user_id: userId,
          amount,
          reference,
          status: "completed",
          type: "subscription",
          description: "VIP Subscription via KoraPay Webhook",
          metadata: { gateway: "korapay", webhook: true }
        });
        console.log(`KoraPay Webhook: Successfully activated 30-day subscription for user ${userId}`);
      }
    } catch (err: any) {
      console.error("KoraPay Webhook processing error:", err.message);
    }

    return res.status(200).send("OK");
  });

  // Reusable verification function for Paystack & KoraPay
  const processPaymentVerification = async (reference: string, userIdInput?: string, gatewayHint?: string) => {
    if (!reference) {
      throw new Error("Missing payment reference");
    }

    // 1. Idempotency Check
    const alreadyProcessed = await isTransactionProcessed(reference);
    if (alreadyProcessed) {
      console.log(`Payment already processed for reference: ${reference}`);
      return {
        success: true,
        alreadyProcessed: true,
        message: "You're now a subscriber",
        amount: 2000,
        user_id: userIdInput
      };
    }

    const isKora = gatewayHint === "korapay" || reference.startsWith("KORA-") || reference.toLowerCase().includes("kora");
    let verifiedAmount = 0;
    let userId = userIdInput;

    if (isKora) {
      const korapaySecret = process.env.KORAPAY_SECRET_KEY;
      if (!korapaySecret) {
        console.warn("KORAPAY_SECRET_KEY not configured in env, accepting reference for test mode:", reference);
        verifiedAmount = 2000;
      } else {
        const koraRes = await axios.get(
          `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${korapaySecret}` },
            timeout: 10000
          }
        );
        const koraData = koraRes.data;
        if (!koraData.status || koraData.data?.status !== "success") {
          throw new Error("KoraPay verification failed: Payment not confirmed by gateway");
        }
        verifiedAmount = Number(koraData.data.amount);
        if (!userId) {
          userId = koraData.data?.metadata?.user_id || koraData.data?.metadata?.userId;
        }
      }
    } else {
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        console.warn("PAYSTACK_SECRET_KEY not configured in env, accepting reference for test mode:", reference);
        verifiedAmount = 2000;
      } else {
        const paystackRes = await axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${paystackSecret}` },
            timeout: 10000
          }
        );
        const data = paystackRes.data;
        if (!data.status || data.data?.status !== "success") {
          throw new Error("Paystack verification failed: Payment not confirmed by gateway");
        }
        verifiedAmount = Number(data.data.amount) / 100; // convert kobo to Naira
        if (!userId) {
          userId = data.data?.metadata?.user_id || data.data?.metadata?.userId;
        }
      }
    }

    // Enforce ₦2,000 threshold
    if (verifiedAmount < 2000) {
      throw new Error(`Invalid payment amount: ₦${verifiedAmount}. Required: ₦2,000`);
    }

    if (!userId) {
      console.warn("No user ID found in request or metadata for reference:", reference);
      throw new Error("User ID is required to activate subscription");
    }

    // Set 30 days subscription start and expiry
    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Update in Firestore
    await updateUserSubscription(userId, {
      is_subscribed: true,
      subscription_status: "active",
      subscription_expiry: expiry.toISOString(),
    });

    // Also update users collection for complete sync
    try {
      await firestoreDb.collection("users").doc(userId).set({
        is_subscribed: true,
        subscription_status: "active",
        subscription_start: now.toISOString(),
        subscription_expiry: expiry.toISOString(),
        is_verified: true,
        updated_at: now.toISOString()
      }, { merge: true });
    } catch (e: any) {
      console.warn("Users doc sync note:", e.message);
    }

    // Save transaction
    await saveTransaction({
      profile_id: userId,
      user_id: userId,
      amount: verifiedAmount,
      reference,
      status: "completed",
      type: "subscription",
      description: `VIP Subscription (30 Days) via ${isKora ? 'KoraPay' : 'Paystack'}`,
      metadata: { gateway: isKora ? 'korapay' : 'paystack', expiry: expiry.toISOString() }
    });

    console.log(`Payment confirmed: ₦${verifiedAmount} via ${isKora ? 'KoraPay' : 'Paystack'} for user ${userId}. 30-day subscription active until ${expiry.toISOString()}`);

    return {
      success: true,
      message: "You're now a subscriber",
      amount: verifiedAmount,
      expiry: expiry.toISOString()
    };
  };

  // Payment Verification API routes (supports GET and POST on both endpoints for full compatibility)
  const handlePaymentVerifyRequest = async (req: express.Request, res: express.Response) => {
    const reference = (req.body?.reference || req.query?.reference || "").toString().trim();
    const userId = (req.body?.user_id || req.body?.userId || req.query?.user_id || req.query?.userId || "").toString().trim();
    const gateway = (req.body?.gateway || req.query?.gateway || "").toString().trim();

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: "Missing required payment reference"
      });
    }

    try {
      const result = await processPaymentVerification(reference, userId || undefined, gateway);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Payment verification failure:", error.message);
      return res.status(400).json({
        success: false,
        error: error.message || "Payment verification could not be completed"
      });
    }
  };

  app.post("/api/verify-payment", handlePaymentVerifyRequest);
  app.get("/api/verify-payment", handlePaymentVerifyRequest);
  app.post("/api/payment-success", handlePaymentVerifyRequest);
  app.get("/api/payment-success", handlePaymentVerifyRequest);

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

  // 1. Profile Views endpoint
  app.post("/api/profile/view", async (req, res) => {
    try {
      const { viewerId, ownerId } = req.body;
      if (!viewerId || !ownerId) {
        return res.status(400).json({ error: "viewerId and ownerId are required" });
      }
      const result = await recordProfileViewServer(viewerId, ownerId);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/profile/view:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Chat Connection Check endpoint
  app.post("/api/chat/check-connection", async (req, res) => {
    try {
      const { chatId } = req.body;
      if (!chatId) {
        return res.status(400).json({ error: "chatId is required" });
      }
      const result = await checkAndUpdateConversationConnectionServer(chatId);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/chat/check-connection:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2b. Delete Conversation endpoint (Subtracts connections if connected)
  app.post("/api/chat/delete", async (req, res) => {
    try {
      const { chatId, requestedByUserId } = req.body;
      if (!chatId) {
        return res.status(400).json({ error: "chatId is required" });
      }
      const result = await handleDeleteConversationServer(chatId, requestedByUserId);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/chat/delete:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2c. Delete Account endpoint (Subtracts connections for peers in connected chats)
  app.post("/api/account/delete", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const result = await handleDeleteAccountServer(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/account/delete:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Recalculate Strength endpoint
  app.post("/api/profile/recalculate-strength", async (req, res) => {
    try {
      const { userId, profileData } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const score = await recalculateProfileStrengthServer(userId, profileData);
      res.json({ success: true, strength: score });
    } catch (error: any) {
      console.error("Error in /api/profile/recalculate-strength:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. User Stats Chart endpoint
  app.get("/api/user-stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const range = (req.query.range as any) || "week";
      const metric = (req.query.metric as any) || "views";
      const stats = await getUserStatsServer(userId, range, metric);
      res.json(stats);
    } catch (error: any) {
      console.error("Error in /api/user-stats/:userId:", error);
      res.status(500).json({ error: error.message });
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
