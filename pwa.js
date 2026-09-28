/**
 * pwa.js — 12-4 Agent Program
 * 모든 HTML 페이지에 공통 포함되는 PWA 초기화 스크립트
 *
 *  1. Service Worker 등록 (/sw.js)
 *  2. 알림 권한 요청 (최초 1회)
 *  3. FCM 토큰 발급 → Firebase users/{studentId} 에 저장 (서버 자동 알림용)
 *  4. localStorage의 캘린더 이벤트 기반 D-Day 포그라운드 알림 체크
 */

(async function initPWA() {

    /* ── 1. Service Worker 등록 ── */
    if (!('serviceWorker' in navigator)) return;

    const basePath = window.location.pathname.includes('/pages/') ? '../' : './';
    let swReg;
    try {
        swReg = await navigator.serviceWorker.register(basePath + 'sw.js');
        console.log('[PWA] Service Worker 등록 완료');
    } catch (err) {
        console.warn('[PWA] SW 등록 실패:', err);
        return;
    }

    /* ── 2. 알림 권한 요청 (default 상태일 때만) ── */
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                showToast('알림이 켜졌습니다! D-7, D-3, D-1, D-Day에 알려드릴게요.');
            }
        } catch (e) { }
    }

    /* ── 3. 알림 권한이 있으면 이벤트 체크 + FCM 토큰 저장 ── */
    if ('Notification' in window && Notification.permission === 'granted') {
        checkEventNotifications();
        setInterval(checkEventNotifications, 60 * 1000); // 1분마다

        /* FCM 토큰 발급 후 Firebase DB에 저장 (서버 알림용) */
        try {
            await registerFcmToken(swReg);
        } catch (e) {
            console.warn('[PWA] FCM 토큰 등록 실패:', e);
        }
    }

})();

/* ═══════════════════════════════════════════════
   FCM 토큰 발급 + Firebase DB 저장
   DB 경로: users/{studentId}/fcmToken
            users/{studentId}/subjects (과목명 배열)
   이후 Netlify scheduled function이 이 데이터를 읽어
   각 학생에게 맞는 D-Day 알림을 자동 전송
═══════════════════════════════════════════════ */
async function registerFcmToken(swReg) {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) return;

    try {
        const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js');
        const { getMessaging, getToken } = await import('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging.js');
        const { getDatabase, ref, set } = await import('https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js');

        const APP_NAME = 'pwa-fcm';
        const firebaseConfig = {
            apiKey: 'AIzaSyCEm-XkkiOP-PshsDhA7naY8RrAB0ty6rk',
            authDomain: 'project-401158774225034026.firebaseapp.com',
            databaseURL: 'https://project-401158774225034026-default-rtdb.asia-southeast1.firebasedatabase.app',
            projectId: 'project-401158774225034026',
            storageBucket: 'project-401158774225034026.firebasestorage.app',
            messagingSenderId: '681425270652',
            appId: '1:681425270652:web:65cd93e979e7c17125d6f9'
        };

        const existingApps = getApps().map(a => a.name);
        const app = existingApps.includes(APP_NAME) ? getApp(APP_NAME) : initializeApp(firebaseConfig, APP_NAME);
        const messaging = getMessaging(app);
        const db = getDatabase(app);

        const VAPID_KEY = 'BA9kIljtq35f0m9LAOQFCcEd82waBToteA5uEy5mPxvc_4TUpIx2qx3HcXksUfhiOntdnFOFBI1L2KjEhTFhP8Y';
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });

        if (!token) {
            console.warn('[PWA] FCM 토큰 발급 실패');
            return;
        }

        const mySubjects = JSON.parse(localStorage.getItem('mySubjects') || '[]');
        const subjectNames = mySubjects.map(s => s.subject || s.name || s.title).filter(Boolean);

        await set(ref(db, `users/${studentId}`), {
            fcmToken: token,
            subjects: subjectNames,
            updatedAt: new Date().toISOString()
        });

        console.log('[PWA] FCM 토큰 DB 저장 완료:', token.slice(0, 20) + '...');
    } catch (err) {
        console.warn('[PWA] FCM 토큰 저장 오류:', err.message);
    }
}

/* ═══════════════════════════════════════════════
   달력 이벤트 D-Day 알림 체크 (포그라운드용)
═══════════════════════════════════════════════ */
function checkEventNotifications() {

    let events = [];
    try {
        events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    } catch (e) {
        return;
    }

    if (!events.length) return;

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];

    events.forEach(e => {

        if (!e.start) return;

        const diffMs = new Date(e.start) - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (![0, 1, 3, 7].includes(diffDays)) return;

        const dedupKey = `pwa-notified:${e.id || e.title}:d${diffDays}:${todayKey}`;
        if (sessionStorage.getItem(dedupKey)) return;
        sessionStorage.setItem(dedupKey, '1');

        const label = diffDays === 0 ? '오늘!' : `D-${diffDays}`;
        const isExam = e.title && (e.title.includes('시험') || e.title.includes('고사'));
        const kind = isExam ? '시험' : '일정';

        const basePath = window.location.pathname.includes('/pages/') ? '../' : './';

        try {
            const noti = new Notification(`${kind} 알림 ${label}`, {
                body: `${e.title}  (${e.start})`,
                icon: basePath + 'assets/android-chrome-192x192.png',
                tag: dedupKey,
                renotify: false
            });
            noti.onclick = () => {
                window.location.href = '/pages/calendar.html';
                noti.close();
            };
        } catch (_) { }

        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) {
                reg.active.postMessage({
                    type: 'CHECK_NOTIFICATIONS',
                    events: events
                });
            }
        });

    });
}

/* ═══════════════════════════════════════════════
   앱 내 토스트 메시지 (인앱 알림 배너)
═══════════════════════════════════════════════ */
function showToast(msg) {
    const el = document.createElement('div');
    el.style.cssText = [
        'position:fixed', 'bottom:20px', 'left:50%',
        'transform:translateX(-50%)',
        'background:#810707', 'color:#fff',
        'padding:12px 22px', 'border-radius:10px',
        'font-size:14px', 'font-family:Arial,sans-serif',
        'z-index:99999', 'pointer-events:none',
        'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
        'max-width:90vw', 'text-align:center',
        'transition:opacity 0.5s'
    ].join(';');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 3200);
    setTimeout(() => el.remove(), 3800);
}
