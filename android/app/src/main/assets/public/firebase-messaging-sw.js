importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// These values will be replaced by the actual config in the build process or via env vars.
firebase.initializeApp({
  apiKey: "AIzaSyCrdd3_dXQpSYN-4w1ZWaufbf14ZRbkQGs",
  authDomain: "gen-lang-client-0722566132.firebaseapp.com",
  projectId: "gen-lang-client-0722566132",
  storageBucket: "gen-lang-client-0722566132.firebasestorage.app",
  messagingSenderId: "704282212306",
  appId: "1:704282212306:web:862e06ef987a203f47ba0b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
