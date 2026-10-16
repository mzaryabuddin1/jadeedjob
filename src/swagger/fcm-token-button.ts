/**
 * Dev helper for /docs: a floating "Get FCM token" button that returns the
 * FCM token of the browser the docs are opened in, so push notifications can
 * be tested without the mobile app.
 *
 * Needs the Firebase WEB app config (Firebase console → Project settings →
 * General → Your apps → Web app, and Cloud Messaging → Web Push certificates):
 *   FIREBASE_WEB_API_KEY, FIREBASE_WEB_APP_ID,
 *   FIREBASE_WEB_MESSAGING_SENDER_ID, FIREBASE_WEB_VAPID_KEY
 *   (FIREBASE_WEB_PROJECT_ID optional — defaults to the service account project)
 * Browsers only allow push on https:// or http://localhost.
 */

const FIREBASE_JS_VERSION = '10.12.2';
const SDK_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_JS_VERSION}`;

export type FcmWebConfig = {
  apiKey?: string;
  appId?: string;
  messagingSenderId?: string;
  projectId?: string;
  vapidKey?: string;
};

export function readFcmWebConfig(): FcmWebConfig {
  let projectId = process.env.FIREBASE_WEB_PROJECT_ID;
  if (!projectId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      projectId =
        require('../firebase/jobslootstaging-8fa70d6ad08a.json').project_id;
    } catch {
      /* service account not available */
    }
  }

  return {
    apiKey: process.env.FIREBASE_WEB_API_KEY,
    appId: process.env.FIREBASE_WEB_APP_ID,
    messagingSenderId: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID,
    projectId,
    vapidKey: process.env.FIREBASE_WEB_VAPID_KEY,
  };
}

/** Service worker served at /firebase-messaging-sw.js (must be at site root) */
export function buildServiceWorker(cfg: FcmWebConfig): string {
  const { vapidKey: _vapidKey, ...firebaseConfig } = cfg;
  return `importScripts('${SDK_BASE}/firebase-app-compat.js');
importScripts('${SDK_BASE}/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(firebaseConfig)});
firebase.messaging(); // background pushes with a "notification" payload are shown by the browser
`;
}

/** Script injected into the Swagger UI page (customJsStr) */
export function buildFcmButtonScript(cfg: FcmWebConfig): string {
  const missing = [
    ['FIREBASE_WEB_API_KEY', cfg.apiKey],
    ['FIREBASE_WEB_APP_ID', cfg.appId],
    ['FIREBASE_WEB_MESSAGING_SENDER_ID', cfg.messagingSenderId],
    ['FIREBASE_WEB_VAPID_KEY', cfg.vapidKey],
    ['FIREBASE_WEB_PROJECT_ID', cfg.projectId],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const { vapidKey, ...firebaseConfig } = cfg;

  return `(function () {
  var CONFIG = ${JSON.stringify(firebaseConfig)};
  var VAPID_KEY = ${JSON.stringify(vapidKey || '')};
  var MISSING = ${JSON.stringify(missing)};
  var SDK = '${SDK_BASE}';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  var btn = document.createElement('button');
  btn.textContent = 'Get FCM token';
  btn.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px 18px;border:0;border-radius:8px;background:#4990e2;color:#fff;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.style.cssText = 'display:none;position:fixed;right:20px;bottom:76px;z-index:9999;width:min(460px,calc(100vw - 40px));padding:16px;border-radius:10px;background:#1b1b1b;color:#eee;font:13px/1.5 sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45)';
  document.body.appendChild(panel);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function show(html) { panel.innerHTML = html; panel.style.display = 'block'; }

  function showToken(token) {
    show(
      '<div style="font-weight:700;margin-bottom:6px">FCM token of this browser</div>' +
      '<textarea id="fcm-token-box" readonly rows="5" style="width:100%;box-sizing:border-box;background:#111;color:#8f8;border:1px solid #444;border-radius:6px;padding:8px;font:12px monospace;word-break:break-all">' + esc(token) + '</textarea>' +
      '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="fcm-copy" style="padding:6px 12px;border:0;border-radius:6px;background:#49cc90;color:#000;font-weight:700;cursor:pointer">Copy</button>' +
      '<button id="fcm-test" style="padding:6px 12px;border:0;border-radius:6px;background:#fca130;color:#000;font-weight:700;cursor:pointer">Send test push</button>' +
      '<button id="fcm-close" style="padding:6px 12px;border:0;border-radius:6px;background:#555;color:#fff;cursor:pointer">Close</button>' +
      '</div>' +
      '<div id="fcm-msg" style="margin-top:8px;color:#aaa"></div>' +
      '<div style="margin-top:8px;color:#888">Paste it as <code>fcmToken</code> in <code>POST /auth/login</code> to attach it to your account.</div>'
    );
    var msg = document.getElementById('fcm-msg');
    document.getElementById('fcm-close').onclick = function () { panel.style.display = 'none'; };
    document.getElementById('fcm-copy').onclick = function () {
      var box = document.getElementById('fcm-token-box'); box.select();
      (navigator.clipboard ? navigator.clipboard.writeText(token) : Promise.reject()).catch(function () { document.execCommand('copy'); });
      msg.textContent = 'Copied!';
    };
    document.getElementById('fcm-test').onclick = function () {
      msg.textContent = 'Sending…';
      fetch('/firebase/test-notification?token=' + encodeURIComponent(token))
        .then(function (r) { return r.json(); })
        .then(function (j) { msg.textContent = j && j.statusCode ? 'Failed: ' + (j.message || j.error) : 'Test push sent ✔'; })
        .catch(function (e) { msg.textContent = 'Failed: ' + e.message; });
    };
  }

  btn.onclick = async function () {
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    if (MISSING.length) {
      show('<b>Firebase web config missing.</b><br>Add to <code>.env</code> and restart:<br><code>' + MISSING.join('<br>') + '</code><br><br>Find them in Firebase console → Project settings → General (Web app) and Cloud Messaging → Web Push certificates.');
      return;
    }
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      show('This browser/page does not support push. Use <b>https://</b> or <b>http://localhost</b>.');
      return;
    }
    show('Getting token…');
    try {
      if (!window.firebase) {
        await loadScript(SDK + '/firebase-app-compat.js');
        await loadScript(SDK + '/firebase-messaging-compat.js');
      }
      var permission = await Notification.requestPermission();
      if (permission !== 'granted') { show('Notification permission is <b>' + permission + '</b>. Allow notifications for this site and try again.'); return; }

      if (!firebase.apps.length) firebase.initializeApp(CONFIG);
      var registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      var messaging = firebase.messaging();
      var token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (!token) throw new Error('No token returned');

      // show pushes that arrive while this docs tab is open
      messaging.onMessage(function (payload) {
        var n = payload.notification || {};
        registration.showNotification(n.title || 'Notification', { body: n.body || '', data: payload.data });
        console.log('FCM foreground message', payload);
      });

      showToken(token);
    } catch (e) {
      show('<b>Could not get token</b><br>' + esc(e && e.message ? e.message : e));
    }
  };
})();`;
}
