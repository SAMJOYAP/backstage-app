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

---

## 최신 상태 (2026-02-24) - Argo 토큰/정리 자동화 연계

### 1) Argo CD API 토큰 발급 전제

- 증상:
  - `account 'admin' does not have apiKey capability`
- 조치:
  - `argocd-cm`에 `accounts.admin: apiKey,login` 반영
  - `argocd-server` rollout restart 수행
- 결과:
  - `Settings > Accounts > admin`에서 토큰 발급 가능 상태 확보

### 2) GitOps orphan cleanup와 연동되는 시크릿 정리

- cleanup 파이프라인에서 사용하는 Argo 시크릿:
  - `ARGOCD_SERVER` (값 형식: `sesac.already11.cloud/argocd`)
  - `ARGOCD_AUTH_TOKEN` (Argo UI/CLI 발급 토큰)
- 운영 권장:
  - 조직(Organization) secret으로 중앙 관리
  - 대상 레포 visibility를 `gitops` 포함 범위로 제한

### 3) 신규 앱 도메인 접속 이슈 운영 메모 (`java-sec-test`)

- 상황:
  - 배포 리소스는 정상인데 신규 앱 도메인 HTTPS 접속 실패 발생
- 확인 결과:
  - Route53 레코드는 존재
  - cert-manager HTTP-01 self-check에서 내부 DNS(`coredns`)가 `NXDOMAIN` 반환
- 처리:
  - `kube-system/coredns` rollout restart
  - cert-manager 재시도 후 인증서 `Ready=True` 전환
- 결론:
  - 신규 앱 도메인 장애 분석 시, Ingress 상태뿐 아니라 CoreDNS 해석 상태를 함께 확인 필요

### 4) 보안 파이프라인 운영 기준 동기화

- SpringBoot Maven 보안 파이프라인 기준 재확인:
  - Trivy `HIGH/CRITICAL` 모두 차단
  - Cosign verify는 strict 실패 기준 유지
- 운영 관점:
  - 배포 실패 시 워크플로우 완화보다 IAM/RBAC/권한 정합성 우선 보정
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

---

## 최신 상태 (2026-02-23 심야) - Argo CD RBAC 기반 엄격 검증 복구

### 1) 안전성 우선으로 preflight 동작 복구

- 파일: `packages/backend/src/plugins/argocd.ts`
- 변경:
  - Argo 사전검증 단계에서 조회/등록 권한이 부족하면 즉시 실패하도록 복구
  - 권한 부족 시 어떤 권한이 필요한지 구체 메시지 반환

핵심 의도:
- 권한 부족 상태를 우회해 배포를 진행하지 않고,
  `검증 통과 시에만` 생성 단계로 진입하도록 보장

### 2) 다중 클러스터 배포를 위한 Argo RBAC 최소 권한

Backstage가 사용하는 Argo 토큰 계정(예: `backstage`)에 아래 권한이 필요:

```csv
p, role:backstage, applications, get, */*, allow
p, role:backstage, applications, list, */*, allow
p, role:backstage, projects, get, *, allow
p, role:backstage, projects, list, *, allow
p, role:backstage, clusters, get, *, allow
p, role:backstage, clusters, list, *, allow
p, role:backstage, clusters, create, *, allow
g, backstage, role:backstage
```

운영 메모:
- 허브 클러스터 외 타깃을 배포하려면 `clusters create` 권한이 필요하다.
- RBAC 적용 후 Backstage가 사용하는 `ARGOCD_AUTH_TOKEN`이
  위 권한이 매핑된 계정 토큰인지 함께 확인해야 한다.

### 8) EKS 선택 배포 안정화 (허브 매핑 + 비허브 자동 등록)

- 배경:
  - 동일 클러스터를 선택해도 Argo CD의 destination server 인식값과
    EKS API endpoint 값이 다르면 `cluster not found`가 발생할 수 있음
- 반영:
  1. 허브 클러스터(`sesac-ref-impl`) 선택 시 destination을
     `https://kubernetes.default.svc`로 강제 매핑
  2. 허브가 아닌 클러스터는 Argo CD 등록 여부 확인 후
     미등록이면 자동 등록 시도
  3. 이미 등록된 클러스터는 skip 처리
  4. 자동 등록 후 재조회 검증까지 통과해야 다음 단계 진행
- UI 반영:
  - EKS 선택 목록에서 허브 클러스터에 `(허브 클러스터)` 라벨 표시
- 실행 순서 보강:
  - `create-repo` 이전 preflight 단계에서 위 검증을 먼저 수행
  - 검증 실패 시 repo/ECR 생성 전에 즉시 중단

---

## 최신 운영 메모 (2026-02-25)

### 1) Argo CD 토큰 권한 체크 포인트

- cleanup/운영 API 호출 시 `session/userinfo`는 통과하지만 `applications delete`가 403일 수 있다.
- 운영 반영 기준:
  - `argocd-rbac-cm`에 `admin:apiKey` 주체 매핑 포함
  - `applications get/list/delete` 권한 명시
- 메모:
  - API 토큰 주체(`sub`)가 `admin:apiKey`로 인식되는지 확인 필요

### 2) 비허브 EKS 배포 장애 판별 기준

- Argo 앱이 `Missing`이어도 원인이 Argo RBAC가 아닐 수 있다.
- 실제 배포 차단은 대상 클러스터 admission 정책(예: Kyverno)에서 발생할 수 있다.
- 우선순위:
  1. Argo `describe application` 실패 메시지
  2. 대상 클러스터 webhook/policy 로그

### 3) 서명 파이프라인과 클러스터 검증의 경계

- GitHub Actions의 `cosign sign/verify` 성공은 "파이프라인 단계" 완료를 의미한다.
- 배포 시점에는 클러스터 정책 엔진(Kyverno)의 별도 재검증이 수행된다.
- 따라서 운영 장애 분석 시 두 단계를 분리해서 확인해야 한다.

---

## 최신 운영 메모 (2026-02-25 추가 반영)

### 1) ACM 인증서 선택 UX 반영

- 스캐폴더에서 ACM 선택 흐름을 강화했다.
  - `ACM 인증서 도메인 선택` 시 `선택된 ACM 도메인`/`선택된 ACM ARN`을 동시 표시
  - 도메인 필터는 `already11.cloud` suffix 기준으로 조회
- 운영 효과:
  - 사용자가 실제 선택한 와일드카드 도메인(`*.already11.cloud`)을 UI에서 바로 확인 가능

### 2) 호스트 접두사 입력 가이드 강화

- 접두사 입력 필드(helperText)에 선택한 ACM 도메인을 동적으로 표시하도록 반영
- 예시:
  - ACM 도메인 `*.already11.cloud` 선택 시
  - 접두사 `api` 입력 안내를 `api.already11.cloud` 형태로 표시

### 3) ACM 조회 API 인증 방식 전환 기준

- 증상:
  - `/api/acm-certificates/certificates` 호출 시 `Missing credentials` 오류 가능
- 운영 기준:
  - 장기 Access Key 주입 대신 IRSA 사용
  - `backstage-already11` ServiceAccount에 IAM Role 연결 후
    `acm:ListCertificates`(권장: `acm:DescribeCertificate`) 권한 부여
