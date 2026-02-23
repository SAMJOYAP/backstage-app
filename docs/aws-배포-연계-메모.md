# Backstage App AWS 배포 연계 메모

## 목적

이 저장소(`backstage-already11`)에서 만든 커스텀 Backstage 이미지를
`SAMJOYAP/gitops`를 통해 `backstage-already11` 배포에 연결한다.

## 현재 반영된 핵심 사항

### 1) 런타임 버전 정합성

- 파일: `Dockerfile`
- 파일: `packages/backend/Dockerfile`
- 변경: Node 베이스 이미지를 `node:20.18.1-bookworm-slim`으로 상향

배경:
- 일부 백엔드 모듈(`isolated-vm`)이 Node 23 환경에서 호환 이슈를 보일 수 있어,
  운영 컨테이너 기준을 Node 20 LTS 계열로 고정했다.

### 2) 브랜딩/한글화 결과물 사용

이 저장소에서 작업한 로고/한글화 결과는 이미지 빌드 결과물에 포함되며,
쿠버네티스에서는 해당 이미지를 pull하여 동일 UI를 제공한다.

## 배포 연결 지점 (GitOps)

`SAMJOYAP/gitops`의 아래 파일에서 이 이미지를 참조한다.

- `apps/backstage-already11/values-already11.yaml`
  - `backstage.image.registry`
  - `backstage.image.repository`
  - `backstage.image.tag`

즉, 실제 배포 버전 전환은 `gitops` 저장소의 `values-already11.yaml` tag 교체로 수행한다.

## 권장 운영 절차

1. `backstage-already11`에서 변경 개발/검증
2. 이미지 빌드 및 레지스트리 push
3. `gitops/apps/backstage-already11/values-already11.yaml` tag 업데이트(PR 기반)
4. Argo CD 동기화 확인
5. `backstage-already11`에서 검증 완료 후 운영 전환 판단

## CI/CD 자동화 (main push 기준)

워크플로우:

- `.github/workflows/build-and-deploy-ecr.yaml`

동작:

1. `main` 브랜치 push 시 실행
2. Git tag(semver) 기준으로 이미지 버전 결정
   - HEAD가 `v1.2.3` 태그면: `1.2.3`
   - HEAD가 태그가 아니면: `기준태그-짧은SHA` (예: `1.2.3-a1b2c3d`)
3. `linux/amd64` 이미지 빌드 후 ECR push
4. `gitops/apps/backstage-already11/values-already11.yaml` 자동 수정
   - `registry`, `repository`, `tag`
5. GitOps 레포(`SAMJOYAP/gitops`)에 PR 생성
6. PR auto-merge 설정
7. Argo CD가 해당 변경을 감지해 `backstage-already11` 최신화

### GitHub Secrets (backstage-already11 레포)

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GITOPS_REPO_TOKEN`
  - `SAMJOYAP/gitops`에 PR 생성/auto-merge 가능한 토큰
  - 최소 `Contents:RW`, `Pull requests:RW` 권한 필요

참고:
- ECR 리전/레포, GitOps 대상 파일은 워크플로우 상단 `env`로 관리한다.
- 버전 기준 태그가 없으면 워크플로우는 실패한다(의도된 동작).

## 검증 체크리스트

- UI 한글화/로고 반영 여부
- Keycloak 로그인 동작
- Catalog/Scaffolder/Argo CD 플러그인 동작
- 기존 `backstage` 인스턴스 영향 없음

## 트러블슈팅 문서 위치

`backstage-already11` 배포/Argo CD/Ingress 이슈의 상세 트러블슈팅은 운영 레포에 기록:

- `reference-implementation-aws/docs/Backstage_already11_트러블슈팅_기록.md`

---

## 최신 반영 사항 (2026-02-22)

### 1) GitOps `apps/backstage-already11` 부트스트랩 보강

- 파일: `.github/workflows/build-and-deploy-ecr.yaml`
- 개선점:
  - `apps/backstage-already11` 디렉터리 자동 생성
  - `manifests/` 하위 필수 파일 자동 생성
    - `external-secrets.yaml`
    - `k8s-config-secret.yaml`
  - `values-already11.yaml` 파일 존재 여부 사전 체크(없으면 명확한 에러로 실패)

### 2) 워크플로 YAML 문법 안정화

- Bootstrap 단계 heredoc/들여쓰기 문제를 정리하여
  GitHub Actions 파싱 오류가 발생하지 않도록 수정.

### 3) 운영 모델 재확인

- `backstage-already11`은 이미지 빌드/배포 트리거 역할
- 실제 배포 선언은 `SAMJOYAP/gitops/apps/backstage-already11`에서 관리
- Argo CD는 GitOps repo 변경을 감지해 반영

### 4) Scaffolder 실패 보상 삭제(rollback) 액션 추가

- 파일: `packages/backend/src/plugins/argocd.ts`
- 액션: `cnoe:create-argocd-app`
- 동작:
  - Argo app 생성 단계 실패 시 cleanup 수행
  - cleanup 대상:
    1. Argo CD Application 삭제
    2. GitHub Repository 삭제(토큰 설정 시)
    3. ECR Repository 삭제(best-effort, AWS CLI/권한 필요)

---

## 최신 상태 (2026-02-23)

### 1) 운영 전환 기준 확정

- `backstage-kr`에서 `backstage-already11` 기준으로 운영 전환을 완료했다.
- GitOps 배포 경로는 `apps/backstage-already11`를 단일 기준으로 유지한다.

### 2) Keycloak 로그인 오류(`Invalid parameter: redirect_uri`) 원인

증상:
- `https://bs.sesac.already11.cloud`에서 Keycloak 로그인 버튼 클릭 시 오류 페이지 노출

핵심 원인:
- Keycloak client의 `Valid Redirect URIs`/`Web Origins`와 Backstage 실제 접근 도메인 불일치

운영 체크 포인트:
1. Keycloak client Redirect URI에 `https://bs.sesac.already11.cloud/*` 포함
2. Keycloak client Web Origins에 `https://bs.sesac.already11.cloud` 포함
3. Backstage auth 설정(`app.baseUrl`, provider redirect URL)이 동일 도메인 기준인지 확인
4. Ingress host/path와 Backstage 공개 URL 일치 여부 점검

### 3) 템플릿 화면 미반영 이슈와의 관계

- 템플릿 한글화/기능(EKS picker)이 소스에는 반영돼도,
  실행 중인 Backstage가 다른 catalog source를 읽으면 UI에 나타나지 않는다.
- 따라서 운영 배포 시점에 `APP_CONFIG_*` 기반 catalog location 오버라이드가 필수다.

---

## 최신 상태 (2026-02-23 저녁) - 템플릿 자동 반영 인증 연동

### 1) BACKSTAGE_API_TOKEN 기반 외부 호출 인증 추가

목적:
- `reference-implementation-aws`의 템플릿 자동 반영 워크플로우가
  Backstage Catalog API를 인증 포함으로 안정 호출하도록 구성

반영:
- GitOps `values.yaml`의 `backstage.appConfig.backend.auth.externalAccess`에
  static token 기반 외부 액세스 허용 추가
- GitOps `external-secrets.yaml`에 `BACKSTAGE_API_TOKEN` 주입 키 추가
- `keycloak` 네임스페이스의 `keycloak-clients` secret에 동일 키/값 반영

### 2) 적용 중 장애 및 복구 기록

증상:
- 신규 파드에서 `password authentication failed for user "backstage"`

원인:
- `backstage-env-vars` 재생성 과정에서 `POSTGRES_PASSWORD` 값 변경

복구:
- PostgreSQL 사용자(`backstage`) 비밀번호를 현재 secret 값으로 재동기화
- 실패 파드 재생성 후 정상화

최종 상태:
- `backstage-already11` Deployment 정상(1/1)
- Catalog API 토큰 기반 자동 반영 경로 사용 가능

---

## 최신 상태 (2026-02-23 밤) - UI/클라우드 템플릿 운영 보강

### 1) 사이드바 SVG 로고 중앙 정렬

- 증상:
  - 좌측 메뉴 상단 로고가 중앙이 아닌 좌측 치우침
- 수정 파일:
  - `packages/app/src/components/Root/Root.tsx`
- 조치:
  - `marginLeft` 제거
  - 로고 컨테이너를 `justifyContent: center` 기준으로 정렬
- 커밋:
  - `1da38f0`

### 2) EKS Cluster Picker AccessDenied 대응

- 오류 메시지:
  - `Failed to list EKS clusters`
  - `An error occurred (AccessDeniedException) ... eks:ListClusters`
- 원인:
  - Backstage backend가 사용하는 IAM 역할에 EKS 조회 권한 부족
- 조치:
  - 노드 역할에 EKS/EC2 조회 권한(inline policy) 추가
  - 파드 재검증 결과 `aws eks list-clusters --region ap-northeast-2` 성공

운영 참고:
- 현재 EKS picker는 AWS CLI를 통해 목록을 조회하므로,
  런타임 IAM 권한(`eks:ListClusters`, `eks:DescribeCluster`)이 필수다.
- 향후 VPC/Subnet picker를 추가할 경우 `ec2:Describe*` 계열 읽기 권한도 함께 관리해야 한다.

### 3) Argo CD Project Picker + Preflight 검증 강화

- `ArgoProjectPicker` 필드 확장 추가
  - 실행 시점 Argo CD 프로젝트 목록을 조회해 선택 가능
- `cnoe:create-argocd-app` preflight 검증 강화
  - 선택한 Argo Project 존재 여부 확인
  - 선택한 EKS Cluster가 Argo CD destination cluster로 등록되어 있는지 확인

효과:
- 템플릿 실행 중 잘못된 project/cluster 입력으로 인한 생성 실패를 사전에 차단

### 4) Namespace 기본값 자동 입력 필드 추가

- `DefaultNamespace` 필드 확장 추가
- `targetNamespace`에 프로젝트 이름(`name`/`projectName`)을 초기값으로 자동 입력
- 사용자가 직접 수정한 값은 그대로 유지

### 5) 템플릿 입력 UX 최신화

- `EKS Cluster` 필수화
- `클라우드 배포 옵션` + `배포 옵션`을 `클라우드/배포 옵션` 단일 섹션으로 통합
- picker helper text 한글화
  - EKS: `<region> 리전의 EKS 클러스터 목록입니다.`
  - Argo: `<instance> Argo Instance의 Project 목록입니다.`

### 6) 템플릿 카드 UI 커스터마이징

- `ScaffolderPage`에 `TemplateCardComponent` 커스텀 카드 적용
- 템플릿 `metadata.annotations` 기반으로 카드 아이콘/대표색/스택 라벨 렌더링
  - `sesac.io/template-icon`
  - `sesac.io/template-color`
  - `sesac.io/template-stack`
- `service/infrastructure` 타입, owner, 즐겨찾기 표시 복원
- 카드 동작/가독성 보강:
  - 즐겨찾기 클릭 시 템플릿 상세 페이지로 이동하지 않도록 이벤트 전파 차단
  - `service`/`infrastructure` 타입 배지 색상 구분 강화
  - 다크/라이트 테마 모두에서 description/메타 텍스트가 읽히도록 테마 기반 색상 적용

### 7) 프로젝트 이름 기반 기본값 자동 입력 확장

- 신규 필드 확장:
  - `RepoUrlFromProjectPicker`
  - `DefaultFromProjectText`
- 적용 범위:
  - `repoUrl`: 레포지토리 이름 미입력 시 프로젝트 이름 자동 사용
  - `hostPrefix`: 미입력 시 프로젝트 이름 자동 사용
  - `targetNamespace`: 미입력 시 프로젝트 이름 자동 사용
