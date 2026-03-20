/**
 * Mock Data for Local Mode
 */

export const MOCK_USERS = [
  {
    id: 'mock-user-123',
    username: 'demo_user',
    display_name: 'Demo User',
    photo_url: 'https://picsum.photos/seed/demo/200/200',
    role: 'admin',
    is_verified: true,
    is_suspended: false,
    profile_mode: 'public',
    balance: 5000,
    bio: 'Platform Administrator and Demo User.',
    preferences: ['Admin', 'Support', 'Tech'],
    created_at: new Date().toISOString()
  },
  {
    id: 'user-1',
    username: 'alex_vibe',
    display_name: 'Alex Vibe',
    photo_url: 'https://picsum.photos/seed/alex/200/200',
    role: 'user',
    is_verified: true,
    is_suspended: false,
    profile_mode: 'public',
    balance: 0,
    bio: 'Living life one vibe at a time.',
    preferences: ['Travel', 'Music', 'Vibes'],
    created_at: new Date().toISOString()
  },
  {
    id: 'user-2',
    username: 'sarah_j',
    display_name: 'Sarah Jordan',
    photo_url: 'https://picsum.photos/seed/sarah/200/200',
    role: 'user',
    is_verified: false,
    is_suspended: true,
    profile_mode: 'public',
    balance: 0,
    bio: 'Art lover and coffee enthusiast.',
    preferences: ['Art', 'Coffee', 'Design'],
    created_at: new Date().toISOString()
  },
  {
    id: 'user-3',
    username: 'tech_guru',
    display_name: 'Tech Guru',
    photo_url: 'https://picsum.photos/seed/tech/200/200',
    role: 'user',
    is_verified: true,
    is_suspended: false,
    profile_mode: 'public',
    balance: 0,
    bio: 'Building the future, one line of code at a time.',
    preferences: ['Tech', 'Coding', 'Future'],
    created_at: new Date().toISOString()
  },
  {
    id: 'user-4',
    username: 'lara_k',
    display_name: 'Lara Croft',
    photo_url: 'https://picsum.photos/seed/lara/200/200',
    role: 'user',
    is_verified: true,
    is_suspended: false,
    profile_mode: 'public',
    balance: 0,
    bio: 'Explorer and adventurer.',
    preferences: ['Adventure', 'History', 'Travel'],
    created_at: new Date().toISOString()
  },
  {
    id: 'user-5',
    username: 'mike_99',
    display_name: 'Mike Ross',
    photo_url: 'https://picsum.photos/seed/mike/200/200',
    role: 'user',
    is_verified: false,
    is_suspended: false,
    profile_mode: 'public',
    balance: 0,
    bio: 'Legal mind and chess player.',
    preferences: ['Law', 'Chess', 'Strategy'],
    created_at: new Date().toISOString()
  }
];

export const MOCK_CHATS = [
  {
    id: 'chat-1',
    last_message: 'Hey, how are you doing?',
    last_timestamp: new Date().toISOString(),
    participants: [
      { id: 'mock-user-123', username: 'demo_user' },
      { id: 'user-1', username: 'alex_vibe', photo_url: 'https://picsum.photos/seed/alex/200/200' }
    ]
  },
  {
    id: 'chat-2',
    last_message: 'The project looks great!',
    last_timestamp: new Date(Date.now() - 3600000).toISOString(),
    participants: [
      { id: 'mock-user-123', username: 'demo_user' },
      { id: 'user-2', username: 'sarah_j', photo_url: 'https://picsum.photos/seed/sarah/200/200' }
    ]
  }
];

export const MOCK_MESSAGES = [
  {
    id: 'msg-1',
    chat_id: 'chat-1',
    sender_id: 'user-1',
    content: 'Hey, how are you doing?',
    message_type: 'text',
    created_at: new Date().toISOString()
  },
  {
    id: 'msg-2',
    chat_id: 'chat-1',
    sender_id: 'mock-user-123',
    content: 'I am doing great, thanks for asking!',
    message_type: 'text',
    created_at: new Date(Date.now() - 60000).toISOString()
  }
];

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx-1',
    from_uid: 'system',
    to_uid: 'mock-user-123',
    amount: 5000,
    commission: 0,
    type: 'deposit',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'tx-2',
    from_uid: 'user-1',
    to_uid: 'user-4',
    amount: 1500,
    commission: 375,
    type: 'subscription',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'tx-3',
    from_uid: 'user-5',
    to_uid: 'user-2',
    amount: 2500,
    commission: 625,
    type: 'tip',
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'tx-4',
    from_uid: 'user-3',
    to_uid: 'user-1',
    amount: 1500,
    commission: 375,
    type: 'subscription',
    timestamp: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'tx-5',
    from_uid: 'user-4',
    to_uid: 'user-3',
    amount: 5000,
    commission: 1250,
    type: 'tip',
    timestamp: new Date(Date.now() - 14400000).toISOString()
  }
];
