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
    // 🔍 CHECK ENVIRONMENT VARIABLES (Support both VITE_ and standard names)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const korapayKey = process.env.KORAPAY_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables:", { 
        supabaseUrl: !!supabaseUrl, 
        supabaseKey: !!supabaseKey 
      });
      return res.status(500).json({ 
        success: false, 
        message: "Server configuration error: Missing Supabase variables on Vercel" 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔍 PARSE BODY
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("Failed to parse body:", e);
      }
    }
    
    const { reference, user_id, type, gateway } = body || {};
    const selectedGateway = gateway || (reference?.startsWith('KORA') ? 'korapay' : 'paystack');

    if (!reference || !user_id) {
      return res.status(400).json({ success: false, message: "Missing reference or user_id" });
    }

    let amount = 0;
    let verificationSuccess = false;

    // 🔍 VERIFY PAYMENT BASED ON GATEWAY
    if (selectedGateway === 'korapay') {
      if (!korapayKey) {
        return res.status(500).json({ success: false, message: "KoraPay secret key missing on Vercel" });
      }
      
      console.log("Verifying KoraPay reference:", reference);
      const verifyRes = await fetch(
        `https://api.korapay.com/merchant/api/v1/charges/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${korapayKey}`,
          },
        }
      );
      
      const data = await verifyRes.json();
      console.log("KoraPay response data:", JSON.stringify(data));
      
      if (data.status && data.data && data.data.status === "success") {
        amount = data.data.amount;
        verificationSuccess = true;
      }
    } else {
      // Default to Paystack
      if (!paystackKey) {
        return res.status(500).json({ success: false, message: "Paystack secret key missing on Vercel" });
      }
      
      console.log("Verifying Paystack reference:", reference);
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${paystackKey}`,
          },
        }
      );
      
      const data = await verifyRes.json();
      console.log("Paystack response data:", JSON.stringify(data));
      
      if (data.status && data.data && data.data.status === "success") {
        amount = data.data.amount / 100; // convert from kobo
        verificationSuccess = true;
      }
    }

    if (!verificationSuccess) {
      return res.status(400).json({
        success: false,
        message: "Payment not verified by gateway",
      });
    }

    // 🔁 PREVENT DUPLICATE TRANSACTIONS
    const { data: existing } = await supabase
      .from("transactions")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already processed",
      });
    }

    // 💾 SAVE TRANSACTION (Using profile_id as per schema)
    await supabase.from("transactions").insert([
      {
        profile_id: user_id,
        amount,
        reference,
        status: "completed",
        type: type === 'topup' ? 'deposit' : type,
      },
    ]);

    // 💰 UPDATE WALLET
    if (type === "deposit" || type === "topup") {
      // Try RPC first
      const { error: rpcError } = await supabase.rpc("increment_wallet", {
        user_id_input: user_id,
        amount_input: amount,
      });
      
      if (rpcError) {
        console.warn("RPC increment_wallet failed, falling back to manual update:", rpcError);
        
        // Manual update fallback for wallet table
        const { data: walletData } = await supabase.from("wallet").select("balance").eq("profile_id", user_id).single();
        if (walletData) {
          await supabase.from("wallet").update({ 
            balance: Number(walletData.balance) + Number(amount),
            updated_at: new Date().toISOString()
          }).eq("profile_id", user_id);
        }
        
        // Also update profiles table balance column to be safe
        const { data: profileData } = await supabase.from("profiles").select("balance").eq("id", user_id).single();
        if (profileData) {
          await supabase.from("profiles").update({ 
            balance: Number(profileData.balance) + Number(amount),
            updated_at: new Date().toISOString()
          }).eq("id", user_id);
        }
      }
    }

    // 🔐 ACTIVATE SUBSCRIPTION
    if (type === "subscription") {
      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          is_subscribed: true,
          subscription_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
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
      message: error.message || "Server error",
    });
  }
}
