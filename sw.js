/* =====================================================
   sw.js — 12-4 Agent Program Service Worker
   역할:
     1. 정적 자산 캐싱 (오프라인 대응)
     2. FCM 백그라운드 메시지 수신 (앱 완전 종료 상태 포함)
     3. 달력 D-Day 알림
     4. 알림 클릭 시 앱 포커스
===================================================== */

/* FCM 백그라운드 메시지 처리를 위해 Firebase compat SDK 로드 */
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

const _firebaseApp = firebase.initializeApp({
    apiKey: "AIzaSyCEm-XkkiOP-PshsDhA7naY8RrAB0ty6rk",
    authDomain: "project-401158774225034026.firebaseapp.com",
    databaseURL: "https://project-401158774225034026-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "project-401158774225034026",
    storageBucket: "project-401158774225034026.firebasestorage.app",
    messagingSenderId: "681425270652",
    appId: "1:681425270652:web:65cd93e979e7c17125d6f9"
});

const _messaging = firebase.messaging();

/* ── FCM 백그라운드/종료 상태 메시지 처리 ── */
_messaging.onBackgroundMessage((payload) => {
    // data-only 메시지: payload.data에서 읽기 (notification 없음)
    const data = payload.data || payload.notification || {};
    const title = data.title || '새 알림';
    const body = data.body || '';
    const url = data.url || '/pages/calendar.html';

    self.registration.showNotification(title, {
        body,
        icon: '/assets/android-chrome-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'fcm-' + title + '-' + Date.now(),
        renotify: true,
        data: { url }
    });
});

const CACHE_NAME = 'agent-v5';

const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './pwa.js',
    './manifest.json',
    './pages/landing.html',
    './pages/calendar.html',
    './pages/journal.html',
    './pages/activity.html',
    './pages/request.html',
    './pages/admino.html',
    './assets/android-chrome-192x192.png',
    './assets/android-chrome-512x512.png',
    './assets/favicon-32x32.png',
    './assets/favicon.ico'
];

/* ── 설치: 정적 자산 프리캐시 ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(STATIC_ASSETS).catch(() => {
                /* 일부 실패해도 설치 계속 */
            })
        )
    );
    self.skipWaiting();
});

/* ── 활성화: 구버전 캐시 삭제 ── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

/* ── Fetch: Stale-While-Revalidate 전략 ── */
self.addEventListener('fetch', event => {
    const url = event.request.url;

    /* Firebase / 외부 CDN은 캐시 건드리지 않음 */
    if (
        event.request.method !== 'GET' ||
        url.includes('firebasedatabase') ||
        url.includes('firebasejs') ||
        url.includes('gstatic') ||
        url.includes('googleapis')
    ) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse.ok) {
                    const resClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
                }
                return networkResponse;
            }).catch(() => {
                // Network failed, maybe offline
            });

            // Return cached response immediately if available, while fetching in background
            return cached || fetchPromise;
        })
    );
});

/* ── 메시지: pwa.js에서 이벤트 목록 전달 시 ── */
self.addEventListener('message', event => {

    if (!event.data) return;

    if (event.data.type === 'CHECK_NOTIFICATIONS') {
        handleNotifications(event.data.events || []);
    }

    /* 관리자용: 새 건의 알림 */
    if (event.data.type === 'NEW_REQUEST') {
        const { title, body, url } = event.data;
        self.registration.showNotification(title || '새로운 건의사항이 접수되었습니다', {
            body: body || '확인하려면 탭하세요.',
            icon: './assets/android-chrome-192x192.png',
            vibrate: [200, 100, 200, 100, 200],
            tag: 'new-request-' + Date.now(),
            renotify: true,
            data: { url: url || '/pages/admino.html' }
        });
    }

});

/* ── 서버 푸시 (Netlify Function에서 FCM V1 API로 전송된 메시지) ── */
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || '알림', {
            body: data.body || '확인하려면 탭하세요.',
            icon: './assets/android-chrome-192x192.png',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/pages/landing.html' }
        })
    );
});

/* ── 알림 클릭: 해당 페이지 열기 ── */
self.addEventListener('notificationclick', event => {
    event.notification.close();

    // data.url 에서 절대 URL 구성
    let targetPath = (event.notification.data && event.notification.data.url) || '/';

    // 상대경로 → 절대 URL 변환
    const base = self.registration.scope; // e.g. "https://yoursite.netlify.app/"
    const targetUrl = targetPath.startsWith('http')
        ? targetPath
        : new URL(targetPath.replace(/^\.\//, ''), base).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            // 이미 해당 페이지가 열려 있으면 포커스
            for (const c of list) {
                if (c.url === targetUrl && 'focus' in c) {
                    return c.focus();
                }
            }
            // 없으면 새 창/탭으로 열기
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});


/* ═══════════════════════════════════════════════════
   백그라운드 알림 처리
   (포그라운드는 pwa.js의 Notification API가 처리)
═══════════════════════════════════════════════════ */
function handleNotifications(events) {

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];

    events.forEach(e => {

        if (!e.start) return;

        const diffMs = new Date(e.start) - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (![0, 1, 3, 7].includes(diffDays)) return;

        const dedupKey = `sw-notified:${e.id || e.title}:d${diffDays}:${todayKey}`;

        /* SW는 sessionStorage 없음 → 간단한 인메모리 중복 방지 */
        if (!self._notifiedKeys) self._notifiedKeys = new Set();
        if (self._notifiedKeys.has(dedupKey)) return;
        self._notifiedKeys.add(dedupKey);

        const label = diffDays === 0 ? '오늘!' : `D-${diffDays}`;
        const isExam = e.title && (e.title.includes('시험') || e.title.includes('고사'));
        self.registration.showNotification(
            `${isExam ? '시험' : '일정'} 알림 ${label}`,
            {
                body: `${e.title}  (${e.start})`,
                icon: './assets/android-chrome-192x192.png',
                vibrate: isExam ? [300, 100, 300, 100, 300] : [200, 100, 200],
                tag: dedupKey,
                renotify: false,
                data: { url: '/pages/calendar.html' }
            }
        );

    });
}
