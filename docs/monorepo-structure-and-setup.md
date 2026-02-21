# Backstage 모노레포 구조/실행/환경 구성 가이드

## 1. 개요

이 저장소는 Backstage 기반 **모노레포**이며, 다음을 함께 관리합니다.

- 프론트엔드 앱 (`packages/app`)
- 백엔드 서버 (`packages/backend`)
- 사내/커스텀 플러그인 (`plugins/*`)

루트는 Yarn Workspaces로 패키지를 묶고, 개발 시 프론트/백엔드를 동시에 실행합니다.

---

## 2. 디렉터리 구조

```txt
.
├─ packages/
│  ├─ app/                 # Backstage 프론트엔드 앱 (role: frontend)
│  └─ backend/             # Backstage 백엔드 앱 (role: backend)
├─ plugins/
│  ├─ cnoe-ui/             # 커스텀 UI 플러그인 (frontend-plugin)
│  ├─ argo-workflows/      # 커스텀 프론트 플러그인
│  ├─ apache-spark/        # 커스텀 프론트 플러그인
│  ├─ terraform/           # 커스텀 프론트 플러그인
│  └─ terraform-backend/   # 커스텀 백엔드 플러그인 (backend-plugin)
├─ app-config.yaml         # 기본 실행 설정
├─ app-config.production.yaml
├─ scripts/
│  └─ localize-backstage.js # postinstall 한글화 치환 스크립트
└─ docs/
   ├─ localization-ko.md
   └─ monorepo-structure-and-setup.md
```

---

## 3. 실행 구조(런타임 플로우)

1. 브라우저가 `http://localhost:3000` 접속  
2. 프론트(`packages/app`)가 페이지 렌더링 + 플러그인 UI 로드  
3. 프론트가 백엔드 API(`http://localhost:7007`) 호출  
4. 백엔드(`packages/backend`)가 catalog/search/scaffolder/techdocs/auth 등 플러그인 처리  
5. 백엔드가 외부 시스템(예: Gitea, ArgoCD, Kubernetes, Keycloak)과 연동

---

## 4. 워크스페이스/스크립트

루트 `package.json` 기준:

- 워크스페이스: `packages/*`, `plugins/*`
- 주요 명령:
  - `yarn dev` : 프론트+백엔드 동시 실행
  - `yarn start` : 프론트만 실행
  - `yarn start-backend` : 백엔드만 실행
  - `yarn build:all` : 전체 빌드
  - `yarn tsc` : 타입체크
- postinstall:
  - `node scripts/localize-backstage.js` 자동 실행
  - 설치 후 `node_modules` 대상 한글화 치환 반영

---

## 5. 로컬 실행 방법

## 5.1 사전 요구사항

- Node.js: `18` 또는 `20`
- Yarn: `1.22.x` (workspace 사용)
- (권장) idpbuilder 기반 로컬 클러스터

## 5.2 기본 실행

```bash
yarn install
yarn dev
```

개별 실행:

```bash
yarn start          # frontend (:3000)
yarn start-backend  # backend  (:7007)
```

---

## 6. 환경 구성(app-config)

기본 설정 파일은 `app-config.yaml`입니다.

핵심 항목:

- `app.baseUrl`: 프론트 URL (`http://localhost:3000`)
- `backend.baseUrl`, `backend.listen.port`: 백엔드 URL/포트 (`7007`)
- `auth.providers`: guest / keycloak-oidc
- `integrations.gitea`: Gitea 연동 정보
- `kubernetes.clusterLocatorMethods`: 클러스터 URL/토큰
- `argocd.appLocatorMethods`: ArgoCD URL/계정
- `catalog.locations`: 카탈로그 엔티티/템플릿 소스

`app-config.local.yaml`은 선택 사항이며(현재 저장소에 파일 없음), 로컬 오버라이드가 필요할 때 직접 생성해서 사용합니다.

---

## 7. 주요 환경변수(예시)

`app-config.yaml`에서 참조하는 값:

- `GITEA_PASSWORD`
- `KEYCLOAK_CLIENT_SECRET`
- `ARGOCD_ADMIN_PASSWORD`

권장 방식:

1. 민감값은 파일 하드코딩 대신 환경변수 사용
2. 쉘에서 export 후 실행

예:

```bash
export GITEA_PASSWORD=...
export KEYCLOAK_CLIENT_SECRET=...
export ARGOCD_ADMIN_PASSWORD=...
yarn dev
```

---

## 8. 플러그인 연결 포인트

- 프론트 라우팅/플러그인 등록: `packages/app/src/App.tsx`
- 백엔드 플러그인 초기화: `packages/backend/src/index.ts`
- 커스텀 UI(홈/로고/테마): `plugins/cnoe-ui`
- 커스텀 백엔드 플러그인: `plugins/terraform-backend`

---

## 9. 한글화와의 관계(요약)

- 앱 레벨 번역: `packages/app/src/translations/ko.ts`, `App.tsx`
- 커스텀 페이지 번역: 예) `KoreanCatalogImportPage`
- 플러그인 번들 치환: `scripts/localize-backstage.js` (postinstall 자동)

상세 이력/주의사항은 `docs/localization-ko.md`를 참고합니다.

---

## 10. 트러블슈팅 빠른 체크

1. 의존성 설치 후 한글화 미반영  
   - `node scripts/localize-backstage.js` 재실행
2. 타입 오류 확인  
   - `yarn tsc`
3. 포트 충돌/권한 문제  
   - `3000`, `7007` 사용 가능 여부 확인
4. 인증 연동 실패  
   - `app-config.yaml`의 provider 설정/환경변수 점검

