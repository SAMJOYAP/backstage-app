# Backstage App AWS 배포 연계 메모

## 목적

이 저장소(`backstage-app`)에서 만든 커스텀 Backstage 이미지를
`reference-implementation-aws`의 신규 네임스페이스(`backstage-kr`) 배포에 연결한다.

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

## 배포 연결 지점 (다른 레포에서 참조)

`reference-implementation-aws`의 아래 파일에서 이 이미지를 참조한다.

- `packages/backstage/values-kr.yaml`
  - `backstage.image.registry`
  - `backstage.image.repository`
  - `backstage.image.tag`

즉, 실제 배포 버전 전환은 `reference-implementation-aws`에서 image tag 교체로 수행한다.

## 권장 운영 절차

1. `backstage-app`에서 변경 개발/검증
2. 이미지 빌드 및 레지스트리 push
3. `reference-implementation-aws`의 `values-kr.yaml` tag 업데이트
4. Argo CD 동기화 확인
5. `backstage-kr`에서 검증 완료 후 운영 전환 판단

## CI/CD 자동화 (main push 기준)

워크플로우:

- `.github/workflows/build-and-deploy-ecr.yaml`

동작:

1. `main` 브랜치 push 시 실행
2. Git tag(semver) 기준으로 이미지 버전 결정
   - HEAD가 `v1.2.3` 태그면: `1.2.3`
   - HEAD가 태그가 아니면: `기준태그-짧은SHA` (예: `1.2.3-a1b2c3d`)
3. `linux/amd64` 이미지 빌드 후 ECR push
4. `reference-implementation-aws/packages/backstage/values-kr.yaml` 자동 수정
   - `registry`, `repository`, `tag`
5. GitOps 레포(`reference-implementation-aws`) `main`에 자동 커밋/푸시
6. Argo CD가 해당 변경을 감지해 `backstage-kr` 최신화

### GitHub Secrets (backstage-app 레포)

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `REFERENCE_REPO_PAT`
  - `reference-implementation-aws`에 push 가능한 PAT
  - 최소 `repo` 권한 필요

참고:
- ECR 리전/레포, GitOps 대상 파일은 워크플로우 상단 `env`로 관리한다.
- 버전 기준 태그가 없으면 워크플로우는 실패한다(의도된 동작).

## 검증 체크리스트

- UI 한글화/로고 반영 여부
- Keycloak 로그인 동작
- Catalog/Scaffolder/Argo CD 플러그인 동작
- 기존 `backstage` 인스턴스 영향 없음

## 트러블슈팅 문서 위치

`backstage-kr` 배포/Argo CD/Ingress 이슈의 상세 트러블슈팅은 운영 레포에 기록:

- `reference-implementation-aws/docs/Backstage_kr_트러블슈팅_기록.md`
