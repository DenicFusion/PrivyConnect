import { createClient } from "@supabase/supabase-js";

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
    // 🔍 CHECK ENVIRONMENT VARIABLES
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey || !paystackKey) {
      console.error("Missing environment variables:", { 
        supabaseUrl: !!supabaseUrl, 
        supabaseKey: !!supabaseKey, 
        paystackKey: !!paystackKey 
      });
      return res.status(500).json({ 
        success: false, 
        message: "Server configuration error: Missing environment variables on Vercel" 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔍 PARSE BODY (Vercel usually does this, but let's be safe)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("Failed to parse body:", e);
      }
    }
    
    const { reference, user_id, type } = body || {};

    if (!reference) {
      return res.status(400).json({ success: false, message: "No reference provided" });
    }

// 🔍 VERIFY PAYMENT WITH PAYSTACK
    console.log("Verifying reference:", reference);
    
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
        },
      }
    );

    if (!verifyRes.ok) {
      const errorText = await verifyRes.text();
      console.error("Paystack verification failed:", verifyRes.status, errorText);
      return res.status(400).json({ success: false, message: "Paystack verification failed" });
    }

    const data = await verifyRes.json();
    console.log("Paystack response data:", JSON.stringify(data));

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
    if (type === "deposit" || type === "topup") {
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
