import { 
  calculateProfileStrength, 
  recordProfileViewServer, 
  checkAndUpdateConversationConnectionServer, 
  handleDeleteConversationServer,
  getUserStatsServer,
  memoryStore
} from '../server/services/firebaseService.ts';

async function runTests() {
  console.log("=== PRIVYCONNECT STATS VERIFICATION SUITE ===");

  const timestamp = Date.now();
  const userAId = `test_user_a_${timestamp}`;
  const userBId = `test_user_b_${timestamp}`;
  const chatId = `test_chat_${timestamp}`;

  // STEP A: Initial state
  console.log("\n[TEST A] Check initial stats for new accounts");
  const initialA = {
    id: userAId,
    username: `user_a_${timestamp}`,
    views: 0,
    connections: 0,
    strength: 0
  };
  const initialB = {
    id: userBId,
    username: `user_b_${timestamp}`,
    views: 0,
    connections: 0,
    strength: 0
  };

  memoryStore.profiles.set(userAId, initialA);
  memoryStore.profiles.set(userBId, initialB);

  const statsA0 = await getUserStatsServer(userAId, 'week', 'views');
  const statsB0 = await getUserStatsServer(userBId, 'week', 'views');
  const statsConnA0 = await getUserStatsServer(userAId, 'week', 'connections');
  const statsConnB0 = await getUserStatsServer(userBId, 'week', 'connections');

  console.log(`User A initial Views: ${statsA0.allTimeTotal}, Connections: ${statsConnA0.allTimeTotal}`);
  console.log(`User B initial Views: ${statsB0.allTimeTotal}, Connections: ${statsConnB0.allTimeTotal}`);
  
  if (statsA0.allTimeTotal === 0 && statsB0.allTimeTotal === 0 && statsConnA0.allTimeTotal === 0 && statsConnB0.allTimeTotal === 0) {
    console.log("✅ PASSED: Both accounts start at Views 0 and Connections 0");
  } else {
    throw new Error("Failed test A");
  }

  // STEP B: A opens B's profile twice on same day
  console.log("\n[TEST B] Deduplicated daily profile views");
  const view1 = await recordProfileViewServer(userAId, userBId);
  console.log("A opens B first time:", view1);
  const bViewsAfter1 = memoryStore.profiles.get(userBId)?.views || 0;
  console.log(`B's Views after 1st view: ${bViewsAfter1}`);

  const view2 = await recordProfileViewServer(userAId, userBId);
  console.log("A opens B second time on same day:", view2);
  const bViewsAfter2 = memoryStore.profiles.get(userBId)?.views || 0;
  console.log(`B's Views after 2nd view: ${bViewsAfter2}`);

  // Test self-view
  const selfView = await recordProfileViewServer(userBId, userBId);
  console.log("B opens own profile:", selfView);
  const bViewsAfterSelf = memoryStore.profiles.get(userBId)?.views || 0;
  console.log(`B's Views after self view: ${bViewsAfterSelf}`);

  if (bViewsAfter1 === 1 && bViewsAfter2 === 1 && bViewsAfterSelf === 1 && view1.incremented === true && view2.incremented === false && selfView.incremented === false) {
    console.log("✅ PASSED: A opens B twice on same day -> views go up by 1, not 2. Self-view ignored.");
  } else {
    throw new Error("Failed test B");
  }

  // STEP C: Connections evaluation
  console.log("\n[TEST C] Real 2-way conversation connection evaluation");
  memoryStore.chats.set(chatId, {
    id: chatId,
    participants: [userAId, userBId],
    is_connected: false,
    created_at: new Date().toISOString()
  });

  // A sends a message
  const msg1 = {
    id: `msg_1_${timestamp}`,
    chat_id: chatId,
    sender_id: userAId,
    content: "Hi B!",
    created_at: new Date().toISOString()
  };
  memoryStore.messages.set(chatId, [msg1]);

  const check1 = await checkAndUpdateConversationConnectionServer(chatId);
  console.log("Connection check after A's single message:", check1);

  const pAAfterMsg1 = memoryStore.profiles.get(userAId);
  const pBAfterMsg1 = memoryStore.profiles.get(userBId);
  console.log(`Connections after A only: A=${pAAfterMsg1?.connections || 0}, B=${pBAfterMsg1?.connections || 0}`);

  if ((pAAfterMsg1?.connections || 0) !== 0 || (pBAfterMsg1?.connections || 0) !== 0 || check1.is_connected) {
    throw new Error("Failed one-sided message test");
  }

  // B replies to A
  const msg2 = {
    id: `msg_2_${timestamp}`,
    chat_id: chatId,
    sender_id: userBId,
    content: "Hey A, nice to meet you!",
    created_at: new Date().toISOString()
  };
  memoryStore.messages.set(chatId, [msg1, msg2]);

  const check2 = await checkAndUpdateConversationConnectionServer(chatId);
  console.log("Connection check after B replies:", check2);

  const pAAfterMsg2 = memoryStore.profiles.get(userAId);
  const pBAfterMsg2 = memoryStore.profiles.get(userBId);
  console.log(`Connections after B replies: A=${pAAfterMsg2?.connections}, B=${pBAfterMsg2?.connections}`);

  if (pAAfterMsg2?.connections === 1 && pBAfterMsg2?.connections === 1 && check2.is_connected && check2.newlyConnected) {
    console.log("✅ PASSED: One-sided messages stay 0. When B replies, both go to 1.");
  } else {
    throw new Error("Failed two-way connection test");
  }

  // Test conversation deletion subtracts connection
  console.log("\n[TEST C2] Conversation deletion subtracts connection");
  const delRes = await handleDeleteConversationServer(chatId, userAId);
  console.log("Delete conversation result:", delRes);
  const pAAfterDel = memoryStore.profiles.get(userAId);
  const pBAfterDel = memoryStore.profiles.get(userBId);
  console.log(`Connections after deletion: A=${pAAfterDel?.connections || 0}, B=${pBAfterDel?.connections || 0}`);

  if ((pAAfterDel?.connections || 0) === 0 && (pBAfterDel?.connections || 0) === 0) {
    console.log("✅ PASSED: Deleting conversation subtracts connection for both participants.");
  } else {
    throw new Error("Failed conversation deletion test");
  }

  // STEP D: Profile Strength Calculation
  console.log("\n[TEST D] Profile Strength Exact Rule Calculation (0 to 100%)");
  let testProfile: any = {};
  console.log(`Empty: ${calculateProfileStrength(testProfile)}% (Expected 0)`);

  testProfile.gender = 'female';
  console.log(`+ Gender: ${calculateProfileStrength(testProfile)}% (Expected 10)`);

  testProfile.vibe = 'DINNER_DATE';
  console.log(`+ Vibe: ${calculateProfileStrength(testProfile)}% (Expected 25)`);

  testProfile.state = 'Lagos';
  testProfile.city = 'Victoria Island';
  console.log(`+ Location: ${calculateProfileStrength(testProfile)}% (Expected 40)`);

  testProfile.photos = ['https://example.com/p1.jpg', 'https://example.com/p2.jpg'];
  console.log(`+ 2 Photos: ${calculateProfileStrength(testProfile)}% (Expected 60)`);

  testProfile.photos.push('https://example.com/p3.jpg', 'https://example.com/p4.jpg', 'https://example.com/p5.jpg', 'https://example.com/p6.jpg');
  console.log(`+ 6 Photos (max photo score): ${calculateProfileStrength(testProfile)}% (Expected 80)`);

  testProfile.bio = 'Loving good vibes, genuine conversations, travel and fine dining across Lagos.';
  console.log(`+ Bio (>=20 chars): ${calculateProfileStrength(testProfile)}% (Expected 95)`);

  testProfile.is_subscribed = true;
  const fullScore = calculateProfileStrength(testProfile);
  console.log(`+ Active Subscriber: ${fullScore}% (Expected 100)`);

  if (fullScore === 100) {
    console.log("✅ PASSED: Strength correctly calculates strictly from stored fields according to exact specs.");
  } else {
    throw new Error(`Failed strength test: got ${fullScore}`);
  }

  // STEP E: Check private chart response
  console.log("\n[TEST E] Check Private Stats Chart API");
  const chartRes = await getUserStatsServer(userBId, 'week', 'views');
  console.log(`B's week views chart total: ${chartRes.totalInRange}, all-time: ${chartRes.allTimeTotal}`);
  if (chartRes.allTimeTotal === 1 && chartRes.totalInRange === 1 && chartRes.points.length === 7) {
    console.log("✅ PASSED: Chart correctly returned 7 days with today = 1 view.");
  } else {
    throw new Error("Failed chart test");
  }

  console.log("\n✨ ALL TESTS COMPLETED SUCCESSFULLY! ✨");
}

runTests().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
