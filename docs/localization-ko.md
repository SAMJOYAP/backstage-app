# Backstage 한글화 작업 정리 (Handoff)

## 1. 목표와 현재 상태

목표는 Backstage 웹 UI 전반(앱 페이지 + 플러그인 페이지)의 한글화입니다.
현재는 다음 3단으로 적용되어 있습니다.

1. 앱 레벨 i18n 리소스(공식 지원 번역 ref)
2. `/catalog-import` 커스텀 한글 페이지
3. `postinstall` 시 플러그인 번들 문자열 자동 치환

핵심 결론:
- 플러그인 페이지는 대부분 `node_modules` 내부 렌더링이라, 앱 소스 검색만으로는 문자열 추적이 안 됩니다.
- 공식 번역 ref가 없는/부족한 플러그인은 문자열 치환이 필요합니다.

---

## 2. 적용된 구조

## 2.1 App i18n 리소스
- 파일: `packages/app/src/App.tsx`
- 설정: `createApp({ __experimentalTranslations })`
- `availableLanguages`는 반드시 `en` 포함 필요 (`ko`,`en`)
  - 이유: `@backstage/core-app-api`가 `en` 포함을 강제함
- 번역 ref 연결:
  - `catalogTranslationRef`
  - `catalogReactTranslationRef`
  - `userSettingsTranslationRef`
  - `coreComponentsTranslationRef`

- 번역 메시지 파일:
  - `packages/app/src/translations/ko.ts`

## 2.2 언어 강제 적용
- 파일: `packages/app/src/App.tsx`
- `ForceKoreanLanguage` 컴포넌트를 루트에 추가해 앱 시작 시 `appLanguageApi.setLanguage('ko')` 실행
- 목적: localStorage에 `en`이 남아 있어도 `ko`로 강제

## 2.3 `/catalog-import` 커스텀 페이지
- 파일: `packages/app/src/components/catalog-import/KoreanCatalogImportPage.tsx`
- 라우트: `packages/app/src/App.tsx`의 `/catalog-import`
- 헤더/설명/정보카드/스텝 라벨 한글화

## 2.4 postinstall 자동 치환
- 파일: `scripts/localize-backstage.js`
- 실행: `package.json`의
  - `"postinstall": "node scripts/localize-backstage.js"`
- 대상: `node_modules/@backstage/.../dist/*.esm.js`
- 최근 추가:
  - `@backstage/plugin-search-react`의 `SearchBar` 하드코딩 문구 치환
  - `Search` -> `검색`
  - `Clear` -> `지우기`
  - 기본 placeholder `Search in ...` -> `...에서 검색`

---

## 3. 한글화 대상 플러그인

주요 적용 범위:
- `@backstage/plugin-catalog-import`
- `@backstage/plugin-search`
- `@backstage/plugin-api-docs`
- `@backstage/plugin-techdocs`
- `@backstage/plugin-scaffolder`
- `@backstage/plugin-scaffolder-react` (간접 영향 경로 고려)
- `@backstage/plugin-catalog-graph`

---

## 4. 중요 이슈와 복구 이력 (반드시 숙지)

## 4.1 `Supported languages must include 'en'`
원인:
- `availableLanguages`에서 `en` 제거

조치:
- `availableLanguages: ['ko', 'en']`로 복구
- `ForceKoreanLanguage`로 실사용 언어는 `ko` 강제

## 4.2 문자열 치환 과도 적용으로 import 경로 파손
증상 예:
- `StepReviewLocation` -> `Step검토Location`
- `StepFinishImportLocation` -> `Step완료ImportLocation`
- 다수 `Module not found`

원인:
- 전역 치환에 일반 단어(`Search`, `Template`, `Owner`, `Lifecycle`, `Review`, `Finish`)를 넣어 심볼/경로까지 바뀜

복구:
- 위험 전역 치환 제거
- 파손 파일 직접 원복 (예: `defaults.esm.js` import 경로)
- 이후 `node scripts/localize-backstage.js` + `yarn tsc`로 확인

재발 방지 규칙:
- 전역 치환은 "문장" 또는 따옴표 포함 라벨(`"Review"`) 중심으로만 사용
- 단일 일반 단어 치환 금지

## 4.3 SearchBar 문구가 번역 리소스로 안 바뀌는 문제
증상:
- 홈 검색바 또는 검색 페이지에서 `Clear`가 영어로 남음

원인:
- 일부 버전의 `@backstage/plugin-search-react`는 `SearchBar` 내부에 `Clear`/`Search`를 하드코딩
- `packages/app/src/translations/ko.ts`만으로는 반영되지 않음

조치:
- `scripts/localize-backstage.js`에 아래 파일 패치 추가
  - `node_modules/@backstage/plugin-search-react/dist/components/SearchBar/SearchBar.esm.js`
- `yarn install` 또는 `node scripts/localize-backstage.js` 재실행

검증 포인트:
- 검색 입력 placeholder: `검색` 또는 `...에서 검색`
- 우측 버튼: `지우기`

---

## 5. 운영/검증 절차

### 5.1 기본 검증
1. `node scripts/localize-backstage.js`
2. `yarn tsc`

### 5.2 개발 서버 실행
- `yarn dev`
- 현재 샌드박스 환경에서는 포트 권한 문제로 실패 가능
  - 예: `listen EPERM ... :3000`, `:7007`
- 로컬 환경에서 확인 필요

### 5.3 남은 영어 대응 방식
1. 화면에서 남은 영어 문구를 "정확히" 수집
2. `rg`로 실제 렌더 파일 추적 (`node_modules/@backstage/.../dist/*.esm.js`)
3. 아래 우선순위로 적용
   - (1) 공식 번역 ref (`__experimentalTranslations`)
   - (2) 앱/플러그인 소스에서 직접 props로 덮어쓰기 (예: `placeholder="검색"`)
   - (3) 불가 시 `scripts/localize-backstage.js`에 **파일별 치환** 추가
4. 스크립트 재실행 + 타입체크

---

## 6. 변경 파일 목록 (핵심)

- `packages/app/src/App.tsx`
- `packages/app/src/translations/ko.ts`
- `packages/app/src/components/catalog-import/KoreanCatalogImportPage.tsx`
- `scripts/localize-backstage.js`
- `package.json`
- `plugins/cnoe-ui/src/components/Homepage.tsx` (홈 검색바 `placeholder`/스타일 조정)

---

## 7. 다음 컨텍스트 인수인계 체크리스트

1. `scripts/localize-backstage.js`에 위험 단어 전역 치환이 없는지 확인
   - 특히 `Search`, `Template`, `Owner`, `Lifecycle`, `Review`, `Finish` 단독 치환 금지
2. `availableLanguages`에 `en`이 포함되어 있는지 확인
3. `ForceKoreanLanguage`가 유지되는지 확인
4. 새로 추가한 치환이 import 경로나 export 심볼을 변경하지 않는지 확인
5. 최종적으로 `yarn tsc` 통과 확인
6. 검색바 영어 잔존 시 `plugin-search-react` 하드코딩 치환이 들어갔는지 확인
