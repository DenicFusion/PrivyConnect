import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { reference, user_id, type } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: "No reference provided" });
    }

    // 🔍 VERIFY PAYMENT WITH PAYSTACK
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await verifyRes.json();

    if (!data.status || data.data.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment not verified",
      });
    }

    const amount = data.data.amount / 100; // convert from kobo

    // 🔁 PREVENT DUPLICATE TRANSACTIONS
    const { data: existing } = await supabase
      .from("transactions")
      .select("*")
      .eq("reference", reference)
      .single();

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already processed",
      });
    }

    // 💾 SAVE TRANSACTION
    await supabase.from("transactions").insert([
      {
        user_id,
        amount,
        reference,
        status: "success",
        type,
      },
    ]);

    // 💰 UPDATE WALLET
    if (type === "deposit") {
      await supabase.rpc("increment_wallet", {
        user_id_input: user_id,
        amount_input: amount,
      });
    }

    // 🔐 ACTIVATE SUBSCRIPTION
    if (type === "subscription") {
      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
        })
        .eq("id", user_id);
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and updated",
    });
  } catch (error) {
    console.error("ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}
