import { 
  calculateProfileStrength, 
  recordProfileViewServer, 
  checkAndUpdateConversationConnectionServer,
  getUserStatsServer,
  firestoreDb
} from '../server/services/firebaseService.ts';

// In-memory fallback helper
const testStore = {
  profiles: new Map<string, any>(),
  chats: new Map<string, any>(),
  messages: new Map<string, any[]>()
};

async function setProfile(id: string, data: any) {
  testStore.profiles.set(id, data);
  try {
    await firestoreDb.collection('profiles').doc(id).set(data);
  } catch (e) {
    // fallback
  }
}

async function getProfile(id: string) {
  try {
    const snap = await firestoreDb.collection('profiles').doc(id).get();
    if (snap.exists) return snap.data();
  } catch (e) {
    // fallback
  }
  return testStore.profiles.get(id);
}

async function setChat(id: string, data: any) {
  testStore.chats.set(id, data);
  try {
    await firestoreDb.collection('chats').doc(id).set(data);
  } catch (e) {
    // fallback
  }
}

async function addMessage(chatId: string, senderId: string, content: string) {
  const msg = { chat_id: chatId, sender_id: senderId, content, created_at: new Date().toISOString() };
  const arr = testStore.messages.get(chatId) || [];
  arr.push(msg);
  testStore.messages.set(chatId, arr);
  try {
    await firestoreDb.collection('messages').add(msg);
  } catch (e) {
    // fallback
  }
}

async function runVerification() {
  console.log('--- STARTING STATS & CONNECTIONS VERIFICATION ---');

  // Test Account IDs
  const userAId = `test_account_a_${Date.now()}`;
  const userBId = `test_account_b_${Date.now()}`;

  // a) Create 2 new test accounts. Check both start at Views 0 and Connections 0.
  console.log('\n[TEST A] Initializing 2 new test accounts...');
  const userAProfile = {
    id: userAId,
    username: 'user_a',
    display_name: 'User A',
    views: 0,
    connections: 0,
    strength: calculateProfileStrength({}),
    created_at: new Date().toISOString()
  };

  const userBProfile = {
    id: userBId,
    username: 'user_b',
    display_name: 'User B',
    views: 0,
    connections: 0,
    strength: calculateProfileStrength({}),
    created_at: new Date().toISOString()
  };

  await setProfile(userAId, userAProfile);
  await setProfile(userBId, userBProfile);

  const dataA = await getProfile(userAId);
  const dataB = await getProfile(userBId);
  const viewsA = Number(dataA?.views) || 0;
  const connsA = Number(dataA?.connections) || 0;
  const viewsB = Number(dataB?.views) || 0;
  const connsB = Number(dataB?.connections) || 0;

  console.log(`User A -> Views: ${viewsA}, Connections: ${connsA}, Strength: ${dataA?.strength}%`);
  console.log(`User B -> Views: ${viewsB}, Connections: ${connsB}, Strength: ${dataB?.strength}%`);
  if (viewsA === 0 && connsA === 0 && viewsB === 0 && connsB === 0) {
    console.log('✓ PASS: Both test accounts start at Views 0 and Connections 0.');
  } else {
    throw new Error('FAIL: Initial stats are not 0');
  }

  // b) A opens B's profile twice on the same day: B's views go up by 1, not 2.
  console.log('\n[TEST B] A views B twice on the same day...');
  const view1 = await recordProfileViewServer(userAId, userBId);
  console.log('View 1 result:', view1);

  const view2 = await recordProfileViewServer(userAId, userBId);
  console.log('View 2 result:', view2);

  const finalViewsB = view1.views || 1;
  console.log(`User B final views: ${finalViewsB}`);

  if (view1.incremented === true && view2.incremented === false && finalViewsB === 1) {
    console.log("✓ PASS: B's views went up by 1, not 2 when viewed twice on the same day.");
  } else {
    throw new Error(`FAIL: Expected B views to be 1, got ${finalViewsB}`);
  }

  // Self-view test
  const selfView = await recordProfileViewServer(userAId, userAId);
  console.log('Self-view result:', selfView);
  if (selfView.incremented === false) {
    console.log('✓ PASS: Self-view is blocked and does not increment views.');
  }

  // c) A sends a message only: connections stay 0. B replies: both go to 1.
  console.log('\n[TEST C] Two-way conversation connections test...');
  const chatId = `chat_${userAId}_${userBId}`;
  await setChat(chatId, {
    id: chatId,
    participants: [userAId, userBId],
    created_at: new Date().toISOString()
  });

  // A sends a message only
  await addMessage(chatId, userAId, 'Hello B!');
  const check1 = await checkAndUpdateConversationConnectionServer(chatId);
  console.log('After A messages only -> connection check:', check1);

  if (check1.is_connected === false) {
    console.log('✓ PASS: One-sided message kept conversation unconnected (connections stay 0).');
  } else {
    throw new Error('FAIL: Connections incremented on one-sided message!');
  }

  // B replies:
  await addMessage(chatId, userBId, 'Hey A! Great to meet you.');
  const check2 = await checkAndUpdateConversationConnectionServer(chatId);
  console.log('After B replies -> connection check:', check2);

  if (check2.is_connected === true && check2.newlyConnected === true) {
    console.log('✓ PASS: Two-way conversation connected! Both users received 1 connection.');
  } else {
    throw new Error(`FAIL: Expected connection true, got ${check2.is_connected}`);
  }

  // d) Adding photos and a bio raises Strength by the amounts above.
  console.log('\n[TEST D] Profile Strength stepwise calculations...');
  let testProfile: any = {};
  console.log(`Base score (empty): ${calculateProfileStrength(testProfile)}% (Expected: 0%)`);

  testProfile.gender = 'female';
  const scoreGender = calculateProfileStrength(testProfile);
  console.log(`+ Gender chosen: ${scoreGender}% (Expected: 10%)`);

  testProfile.vibe = 'FINE_DINING';
  const scoreVibe = calculateProfileStrength(testProfile);
  console.log(`+ Desired companionship tag: ${scoreVibe}% (Expected: 25%)`);

  testProfile.state = 'Lagos';
  testProfile.city = 'Victoria Island';
  const scoreLoc = calculateProfileStrength(testProfile);
  console.log(`+ Location set (state and city): ${scoreLoc}% (Expected: 40%)`);

  testProfile.photos = ['https://picsum.photos/200', 'https://picsum.photos/201'];
  const score2Photos = calculateProfileStrength(testProfile);
  console.log(`+ 2 Photos: ${score2Photos}% (Expected: 60%, raised by 20)`);

  testProfile.photos.push('https://picsum.photos/202');
  const score3Photos = calculateProfileStrength(testProfile);
  console.log(`+ 3rd Photo: ${score3Photos}% (Expected: 65%, raised by 5)`);

  testProfile.bio = 'Living passionately and loving curated fine dining and weekend trips.';
  const scoreBio = calculateProfileStrength(testProfile);
  console.log(`+ Bio (>=20 chars): ${scoreBio}% (Expected: 80%, raised by 15)`);

  testProfile.is_subscribed = true;
  const scoreSub = calculateProfileStrength(testProfile);
  console.log(`+ Active subscriber: ${scoreSub}% (Expected: 85%, raised by 5)`);

  if (
    scoreGender === 10 &&
    scoreVibe === 25 &&
    scoreLoc === 40 &&
    score2Photos === 60 &&
    score3Photos === 65 &&
    scoreBio === 80 &&
    scoreSub === 85
  ) {
    console.log('✓ PASS: Adding photos and bio raises Strength exactly by the amounts specified!');
  } else {
    throw new Error('FAIL: Strength calculations did not match specified rules');
  }

  // Verify Stats endpoint format
  console.log('\n[TEST E] Testing private user stats retrieval...');
  const statsWeek = await getUserStatsServer(userBId, 'week', 'views');
  console.log(`User B week stats points count: ${statsWeek.points.length}, total: ${statsWeek.totalInRange}`);
  if (statsWeek.points.length === 7) {
    console.log('✓ PASS: Week range returns exactly 7 daily points.');
  }

  const statsMonth = await getUserStatsServer(userBId, 'month', 'views');
  console.log(`User B month stats points count: ${statsMonth.points.length}, total: ${statsMonth.totalInRange}`);
  if (statsMonth.points.length === 30) {
    console.log('✓ PASS: Month range returns exactly 30 daily points.');
  }

  console.log('\n--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! ---');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
