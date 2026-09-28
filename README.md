# 12-4 Agent Program

English | [한국어](#한국어)

A Korean-language student portal and Progressive Web App (PWA). Students can access a shared elective-course calendar, research and career activity resources, and a request form. Administrators can review requests and receive notifications.

## Features

- Student sign-in using student ID and name, backed by Firebase Realtime Database.
- Shared calendar with schedules, subject filters, and event notifications.
- Curated research and career activity resources.
- Request submission and an administrator dashboard for reviewing requests.
- PWA service worker, offline caching, and Firebase Cloud Messaging notifications.

## Project structure

```text
.
├── index.html             # Student sign-in
├── pages/
│   ├── landing.html        # Student dashboard
│   ├── calendar.html       # Shared elective-course calendar
│   ├── journal.html        # Research resources
│   ├── activity.html       # Career activity resources
│   ├── request.html        # Request form
│   └── admino.html         # Administrator dashboard
├── script.js              # Sign-in logic
├── pwa.js                 # PWA and notification setup
├── sw.js                  # Service worker and push handling
├── admin-fcm.js           # Administrator push registration
├── assets/                # Icons and web manifest
└── netlify.toml           # Netlify configuration
```

## Run locally

There is no build step or root package manifest. Serve the repository root with a local static web server and open the provided address in a browser. For example:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Features that use Firebase or Netlify Functions require their corresponding services and configuration; a static server alone does not provide those services.

## Deployment and integrations

- The site is configured for Netlify in `netlify.toml`.
- Firebase Realtime Database is used for student data, calendar events, and requests; Firebase Cloud Messaging is used for push notifications.
- The Netlify configuration schedules a `daily-reminders` function and request submission calls a `send-fcm` function. Those function source files are not present in this repository, so these integrations need to be supplied by the deployment environment.
- The HTML currently links to `manifest.json`, while the checked-in web manifest is `assets/site.webmanifest`. Ensure the manifest URL is corrected or an appropriately named manifest is provided for PWA installation.

## Data and access

Firebase project configuration is embedded in the client code. Configure Firebase Realtime Database rules and administrator access for the deployment; do not rely on client-side page visibility as an access-control mechanism.

---

# 한국어

한국어 | [English](#12-4-agent-program)

12-4 Agent Program은 학생을 위한 한국어 포털이자 프로그레시브 웹 앱(PWA)입니다. 학생은 선택과목 공유 캘린더, 연구 및 진로 활동 자료, 요청 양식을 이용할 수 있으며, 관리자는 요청을 확인하고 알림을 받을 수 있습니다.

## 주요 기능

- Firebase Realtime Database를 이용한 학번 및 이름 로그인
- 과목 필터와 일정 알림을 제공하는 선택과목 공유 캘린더
- 연구 자료 및 진로 외부 활동 정보 모음
- 요청 제출 및 관리자 요청 확인 대시보드
- 서비스 워커, 오프라인 캐시, Firebase Cloud Messaging 푸시 알림

## 프로젝트 구조

```text
.
├── index.html             # 학생 로그인
├── pages/
│   ├── landing.html        # 학생 대시보드
│   ├── calendar.html       # 선택과목 공유 캘린더
│   ├── journal.html        # 연구 자료
│   ├── activity.html       # 진로 활동 자료
│   ├── request.html        # 요청 양식
│   └── admino.html         # 관리자 대시보드
├── script.js              # 로그인 로직
├── pwa.js                 # PWA 및 알림 초기화
├── sw.js                  # 서비스 워커 및 푸시 처리
├── admin-fcm.js           # 관리자 푸시 등록
├── assets/                # 아이콘 및 웹 앱 매니페스트
└── netlify.toml           # Netlify 설정
```

## 로컬 실행

빌드 단계나 루트 `package.json`은 없습니다. 저장소 루트를 정적 웹 서버로 제공한 뒤 브라우저에서 서버 주소를 여세요. 예를 들면 다음과 같습니다.

```sh
python3 -m http.server 8000
```

이후 <http://localhost:8000>에 접속합니다. Firebase 또는 Netlify Functions를 사용하는 기능은 각 서비스와 설정이 필요하며, 정적 서버만으로는 해당 기능이 동작하지 않습니다.

## 배포 및 연동 서비스

- `netlify.toml`에 Netlify 배포 설정이 있습니다.
- Firebase Realtime Database는 학생 데이터, 캘린더 일정, 요청을 저장하는 데 사용하며, Firebase Cloud Messaging은 푸시 알림에 사용합니다.
- Netlify 설정은 `daily-reminders` 함수를 예약하고, 요청 제출은 `send-fcm` 함수를 호출합니다. 해당 함수 소스 파일은 이 저장소에 없으므로 배포 환경에서 별도로 제공해야 합니다.
- 현재 HTML은 `manifest.json`을 가리키지만 저장소에 포함된 웹 앱 매니페스트 파일은 `assets/site.webmanifest`입니다. PWA 설치를 위해 매니페스트 경로를 수정하거나 해당 이름의 파일을 제공해야 합니다.

## 데이터 및 접근 제어

Firebase 프로젝트 설정이 클라이언트 코드에 포함되어 있습니다. 배포 환경에서 Firebase Realtime Database 규칙과 관리자 접근 권한을 설정하세요. 클라이언트에서 특정 페이지를 숨기는 것만으로 접근을 통제할 수는 없습니다.
