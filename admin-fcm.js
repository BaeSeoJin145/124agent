/**
 * admin-fcm.js
 * 관리자(12418, 12419) 전용 FCM 토큰 등록 모듈
 *
 * 동작 흐름:
 *  1. 관리자 로그인 확인
 *  2. SW 준비 대기
 *  3. 알림 권한 확인 (pwa.js에서 이미 요청했을 수 있으므로 중복 방지)
 *  4. FCM 토큰 발급 → Firebase DB에 저장 → 포그라운드 메시지 수신 등록
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// ★ Firebase Console → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 → 공개 키
const VAPID_KEY = "BA9kIljtq35f0m9LAOQFCcEd82waBToteA5uEy5mPxvc_4TUpIx2qx3HcXksUfhiOntdnFOFBI1L2KjEhTFhP8Y";

const ADMINS = { "12418": true, "12419": true };
const studentId = localStorage.getItem("studentId");

// 관리자만 FCM 등록
if (!studentId || !ADMINS[studentId]) {
    console.log("[FCM] 비관리자 — FCM 등록 건너뜀");
} else {
    initAdminFCM();
}

async function initAdminFCM() {
    try {
        // ── 1. Firebase 앱 인스턴스 (이미 초기화된 경우 재사용)
        const APP_NAME = "admin-fcm";
        const firebaseConfig = {
            apiKey: "AIzaSyCEm-XkkiOP-PshsDhA7naY8RrAB0ty6rk",
            authDomain: "project-401158774225034026.firebaseapp.com",
            databaseURL: "https://project-401158774225034026-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "project-401158774225034026",
            storageBucket: "project-401158774225034026.firebasestorage.app",
            messagingSenderId: "681425270652",
            appId: "1:681425270652:web:65cd93e979e7c17125d6f9"
        };

        const existingApps = getApps().map(a => a.name);
        const app = existingApps.includes(APP_NAME)
            ? getApp(APP_NAME)
            : initializeApp(firebaseConfig, APP_NAME);

        const messaging = getMessaging(app);
        const db = getDatabase(app);

        // ── 2. 알림 권한 — 아직 허용 안 됐으면 요청
        if (!('Notification' in window)) {
            console.warn("[FCM] 이 브라우저는 알림을 지원하지 않음");
            return;
        }

        if (Notification.permission === 'denied') {
            console.warn("[FCM] 알림 권한이 사용자에 의해 차단됨");
            return;
        }

        if (Notification.permission !== 'granted') {
            console.log("[FCM] 알림 권한 요청 중...");
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                console.warn("[FCM] 알림 권한 거부됨");
                return;
            }
        }

        console.log("[FCM] 알림 권한: granted ✓");

        // ── 3. Service Worker 준비 대기 (pwa.js에서 등록한 SW를 사용)
        const swReg = await navigator.serviceWorker.ready;
        console.log("[FCM] Service Worker 준비됨 ✓");

        // ── 4. FCM 토큰 발급
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swReg
        });

        if (!token) {
            console.warn("[FCM] 토큰 발급 실패 — 브라우저 정책 또는 SW 문제일 수 있음");
            return;
        }

        console.log("[FCM] 토큰 발급 완료 ✓", token.slice(0, 20) + "...");

        // ── 5. Firebase DB에 토큰 저장 (다른 클라이언트에서 FCM 발송 시 조회)
        await set(ref(db, `admin-fcm-tokens/${studentId}`), {
            token,
            updatedAt: new Date().toISOString()
        });
        console.log("[FCM] DB 토큰 저장 완료 ✓");

        // ── 6. 포그라운드 메시지 (앱이 열려 있을 때 FCM 메시지 수신)
        onMessage(messaging, (payload) => {
            console.log("[FCM] 포그라운드 메시지 수신:", payload);
            const notification = payload.notification || {};
            if (!notification.title) return;
            try {
                const noti = new Notification(notification.title, {
                    body: notification.body || "",
                    icon: notification.icon || "../assets/android-chrome-192x192.png"
                });
                noti.onclick = () => {
                    window.location.href = '/pages/admino.html';
                    noti.close();
                };
            } catch (err) {
                console.warn("[FCM] 포그라운드 Notification 생성 실패:", err);
            }
        });

    } catch (err) {
        console.error("[FCM] 초기화 오류:", err.code || err.message || err);
    }
}
