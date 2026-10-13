import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';

export const sendInitialNotification = async (userId: string) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      user_id: userId,
      title: 'Welcome to PrivyConnect!',
      message: 'Thanks for joining our premium social infrastructure. Start exploring and connecting with others!',
      type: 'system',
      is_read: false,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unexpected error sending initial notification:', error);
  }
};

