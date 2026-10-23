import { supabase } from '../lib/supabase';

export const sendInitialNotification = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title: 'Welcome to PrivyConnect!',
          message: 'Thanks for joining our premium social infrastructure. Start exploring and connecting with others!',
          type: 'system',
          is_read: false,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error sending initial notification:', error);
    }
  } catch (error) {
    console.error('Unexpected error sending initial notification:', error);
  }
};
