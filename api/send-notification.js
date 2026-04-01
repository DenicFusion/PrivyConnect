import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, recipientId, senderName, message, link, amount, reference, token, title, body } = req.body;

  try {
    // 1. Handle Push Notification (if token provided)
    if (token) {
      console.log('Sending push notification to token:', token);
      // In a real app, you'd use Firebase Cloud Messaging (FCM) or OneSignal here
    }

    // 2. Handle Email Notification
    if (recipientId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, display_name, username')
        .eq('id', recipientId)
        .single();

      if (!profileError && profile?.email) {
        const userName = profile.display_name || profile.username;
        console.log(`Sending ${type} email to ${profile.email} for user ${userName}`);
        
        // In a real app, you'd use Resend, SendGrid, or Postmark here
        // Example with a hypothetical email service:
        /*
        await emailService.send({
          to: profile.email,
          subject: getEmailSubject(type, senderName),
          html: getEmailTemplate(type, userName, senderName, message, amount, reference, link)
        });
        */
      }
    }

    // 3. Create In-App Notification (if not already handled by frontend)
    if (recipientId && type) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: type,
          title: title || getNotificationTitle(type, senderName),
          message: body || message || getNotificationMessage(type, senderName, amount),
          link: link || getDefaultLink(type),
          is_read: false
        });
      
      if (notifError) console.error('Error creating in-app notification:', notifError);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getEmailSubject(type, senderName) {
  switch (type) {
    case 'message': return `New message from ${senderName}`;
    case 'deposit': return 'Deposit Successful - PrivyConnect';
    case 'subscription': return 'Subscription Activated - PrivyConnect';
    case 'retention': return 'Your subscription is expiring soon';
    default: return 'New Notification - PrivyConnect';
  }
}

function getNotificationTitle(type, senderName) {
  switch (type) {
    case 'message': return 'New Message';
    case 'deposit': return 'Deposit Successful';
    case 'subscription': return 'Subscription Active';
    case 'retention': return 'Subscription Expiring';
    default: return 'Notification';
  }
}

function getNotificationMessage(type, senderName, amount) {
  switch (type) {
    case 'message': return `${senderName} sent you a message`;
    case 'deposit': return `Your deposit of ₦${amount?.toLocaleString()} was successful.`;
    case 'subscription': return `Your premium subscription is now active!`;
    case 'retention': return `Your subscription expires in 48 hours. Renew now to keep your benefits.`;
    default: return 'You have a new notification';
  }
}

function getDefaultLink(type) {
  switch (type) {
    case 'message': return '/chats';
    case 'deposit': return '/wallet';
    case 'subscription': return '/wallet';
    case 'retention': return '/wallet';
    default: return '/notifications';
  }
}
