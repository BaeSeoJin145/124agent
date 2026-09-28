import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCEm-XkkiOP-PshsDhA7naY8RrAB0ty6rk",
    authDomain: "project-401158774225034026.firebaseapp.com",
    databaseURL: "https://project-401158774225034026-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "project-401158774225034026",
    storageBucket: "project-401158774225034026.firebasestorage.app",
    messagingSenderId: "681425270652",
    appId: "1:681425270652:web:65cd93e979e7c17125d6f9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 자동 로그인 체크
if (localStorage.getItem("studentId") && localStorage.getItem("studentName")) {
    window.location.replace("./pages/landing.html");
}

async function login() {

    const id = document.getElementById("studentId").value.trim();
    const name = document.getElementById("studentName").value.trim();
    const error = document.getElementById("error");

    error.innerText = "";

    console.log("=== LOGIN START ===");
    console.log("입력 학번:", id);
    console.log("입력 이름:", name);

    if (!id || !name) {
        error.innerText = "학번과 이름 입력";
        return;
    }

    try {

        /* 학생 정보 확인 */

        const studentRef = ref(db, "students/" + id);
        const snap = await get(studentRef);

        console.log("학생 데이터 존재:", snap.exists());

        if (!snap.exists()) {
            error.innerText = "없는 학번";
            return;
        }

        const data = snap.val();
        console.log("학생 데이터:", data);

        if (data.name !== name) {
            error.innerText = "이름 불일치";
            return;
        }

        /* 시간표 읽기 */

        const timetableRef = ref(db, "students/" + id + "/timetable");
        const timetableSnap = await get(timetableRef);

        console.log("timetable 존재:", timetableSnap.exists());
        console.log("timetable 데이터:", timetableSnap.val());

        let mySubjects = [];
        const subjectSet = new Set();

        if (timetableSnap.exists()) {

            const timetable = timetableSnap.val();

            for (const day in timetable) {

                console.log("요일:", day);

                const periods = timetable[day];

                for (const p in periods) {

                    const value = periods[p];

                    console.log("교시:", p, "값:", value);

                    if (!value) continue;

                    const parts = value.split("_");

                    if (parts.length < 2) {
                        console.log("잘못된 형식:", value);
                        continue;
                    }

                    const subject = parts[0];
                    const group = parts[1];

                    const key = subject + "_" + group;

                    if (!subjectSet.has(key)) {

                        subjectSet.add(key);

                        mySubjects.push({
                            subject: subject,
                            group: group
                        });

                        console.log("과목 추가:", subject, group);

                    }

                }

            }

        }

        console.log("=== 최종 과목 목록 ===");
        console.log(mySubjects);

        /* localStorage 저장 */

        localStorage.setItem("studentId", id);
        localStorage.setItem("studentName", name);
        localStorage.setItem("mySubjects", JSON.stringify(mySubjects));

        console.log("localStorage 저장 완료");

        location.href = "./pages/landing.html";

    } catch (e) {

        console.error("로그인 오류:", e);
        error.innerText = "로그인 오류";

    }

}

window.login = login;