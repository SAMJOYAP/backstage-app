const fs = require('fs');
const path = require('path');

const replacementsByFile = {
  'node_modules/@backstage/plugin-catalog-import/dist/components/ImportStepper/defaults.esm.js':
    [
      ['Discovered Locations: ', '발견된 위치: '],
      ['Select Locations', '위치 선택'],
      ['Create Pull Request', 'PR 생성'],
      ['Pull Request Details', 'PR 상세 정보'],
      ['Pull Request Title', 'PR 제목'],
      ['Add Backstage catalog entity descriptor files', 'Backstage 카탈로그 엔티티 설명 파일 추가'],
      ['Pull Request Body', 'PR 본문'],
      ['A describing text with Markdown support', '마크다운을 지원하는 설명 텍스트'],
      ['Entity Configuration', '엔티티 설정'],
      ['Name of the created component', '생성할 컴포넌트 이름'],
      ['Loading groups…', '그룹 불러오는 중…'],
      ['Select an owner from the list or enter a reference to a Group or a User', '목록에서 소유자를 선택하거나 Group/User 참조를 입력하세요'],
      ['required value', '필수 입력값'],
      ['Entity Owner', '엔티티 소유자'],
      ['Use ', '사용: '],
      [' file as Entity Owner', ' 파일을 엔티티 소유자로 사용'],
      ['WARNING: This may fail if no CODEOWNERS file is found at the target location.', '경고: 대상 위치에 CODEOWNERS 파일이 없으면 실패할 수 있습니다.'],
      ['Select URL', 'URL 입력'],
      ['Optional', '선택 사항'],
      ['Import Actions', '가져오기 작업'],
      ['"Review"', '"검토"'],
      ['"Finish"', '"완료"'],
    ],
  'node_modules/@backstage/plugin-catalog-import/dist/components/StepInitAnalyzeUrl/StepInitAnalyzeUrl.esm.js':
    [
      ["Couldn't generate entities for your repository", '저장소에서 엔티티를 생성할 수 없습니다'],
      ['There are no entities at this location', '이 위치에는 엔티티가 없습니다'],
      ['Must start with http:// or https://.', 'http:// 또는 https:// 로 시작해야 합니다.'],
      ['Enter the full path to your entity file to start tracking your component', '컴포넌트 추적을 시작하려면 엔티티 파일의 전체 경로를 입력하세요'],
      ['"Analyze"', '"분석"'],
    ],
  'node_modules/@backstage/plugin-catalog-import/dist/components/StepPrepareSelectLocations/StepPrepareSelectLocations.esm.js':
    [
      ['Select one or more locations that are present in your git repository:', 'Git 저장소에 있는 위치를 하나 이상 선택하세요:'],
      ['Select All', '전체 선택'],
      ['These locations already exist in the catalog:', '다음 위치는 이미 카탈로그에 존재합니다:'],
      ['"Review"', '"검토"'],
    ],
  'node_modules/@backstage/plugin-catalog-import/dist/components/StepReviewLocation/StepReviewLocation.esm.js':
    [
      ['The following Pull Request has been opened:', '다음 Pull Request가 생성되었습니다:'],
      ['You can already import the location and ', '지금 위치를 가져오면 '],
      [' will fetch the entities as soon as the Pull Request is merged.', ' 이 Pull Request가 병합되는 즉시 엔티티를 가져옵니다.'],
      ['The following locations already exist in the catalog:', '다음 위치는 이미 카탈로그에 존재합니다:'],
      ['The following entities will be added to the catalog:', '다음 엔티티가 카탈로그에 추가됩니다:'],
      ['"Refresh"', '"새로고침"'],
      ['"Import"', '"가져오기"'],
    ],
  'node_modules/@backstage/plugin-catalog-import/dist/components/StepFinishImportLocation/StepFinishImportLocation.esm.js':
    [
      ['The following Pull Request has been opened:', '다음 Pull Request가 생성되었습니다:'],
      ['Your entities will be imported as soon as the Pull Request is merged.', 'Pull Request가 병합되면 엔티티가 자동으로 가져와집니다.'],
      ['Register another', '다른 항목 등록'],
      ['The following entities have been added to the catalog:', '다음 엔티티가 카탈로그에 추가되었습니다:'],
      ['A refresh was triggered for the following locations:', '다음 위치에 대해 새로고침이 실행되었습니다:'],
      ['View Component', '컴포넌트 보기'],
    ],
  'node_modules/@backstage/plugin-catalog-import/dist/components/StepPrepareCreatePullRequest/StepPrepareCreatePullRequest.esm.js':
    [
      ['You entered a link to a ', '입력한 링크는 '],
      [' repository but a', ' 저장소이지만 '],
      [' could not be found. Use this form to open a Pull Request that creates one.', ' 파일을 찾을 수 없습니다. 이 양식으로 생성 PR을 열 수 있습니다.'],
      ['Preview Pull Request', 'PR 미리보기'],
      ['Preview Entities', '엔티티 미리보기'],
      ['"Create PR"', '"PR 생성"'],
    ],
  'node_modules/@backstage/plugin-catalog-import/dist/components/StepPrepareCreatePullRequest/PreviewPullRequestComponent.esm.js':
    [['Create a new Pull Request', '새 Pull Request 생성']],
  'node_modules/@backstage/plugin-catalog-import/dist/components/Buttons/index.esm.js':
    [['props.children || "Back"', 'props.children || "뒤로"']],
  'node_modules/@backstage/plugin-catalog-import/dist/components/DefaultImportPage/DefaultImportPage.esm.js':
    [
      ['title: "Register an existing component"', 'title: "기존 컴포넌트 등록"'],
      ['Start tracking your component in ${appTitle}', '${appTitle}에서 컴포넌트 추적 시작'],
      ['Start tracking your component in ', '컴포넌트 추적을 시작하세요: '],
      [' by adding it to the software catalog.', ' 소프트웨어 카탈로그에 추가하면 추적할 수 있습니다.'],
    ],
  'node_modules/@backstage/plugin-catalog-import/dist/components/ImportInfoCard/ImportInfoCard.esm.js':
    [
      ['title: "Register an existing component"', 'title: "기존 컴포넌트 등록"'],
      ['title: "Learn more about the Software Catalog"', 'title: "소프트웨어 카탈로그 더 알아보기"'],
      ['Enter the URL to your source code repository to add it to ', '소스 코드 저장소 URL을 입력해 '],
      ['Link to an existing entity file', '기존 엔티티 파일 링크'],
      ['Link to a repository', '저장소 링크'],
      ['GitHub only', 'GitHub 전용'],
      ['Example: ', '예시: '],
      ['The wizard analyzes the file, previews the entities, and adds them to the ', '마법사가 파일을 분석하고 엔티티를 미리본 뒤 '],
      ['The wizard discovers all ', '마법사가 모든 '],
      [' files in the repository, previews the entities, and adds them to the ', ' 파일을 저장소에서 찾고 엔티티를 미리본 뒤 '],
      ['catalog.', '카탈로그에 추가합니다.'],
      ['If no entities are found, the wizard will prepare a Pull Request that adds an example ', '엔티티를 찾지 못하면 마법사가 예시 '],
      [' and prepares the ', ' 추가 PR을 준비하고 '],
      [' catalog to load all entities as soon as the Pull Request is merged.', ' 카탈로그가 PR 병합 즉시 모든 엔티티를 로드하도록 준비합니다.'],
    ],
  'node_modules/@backstage/plugin-search/dist/alpha.esm.js': [
    ['title: "Search"', 'title: "검색"'],
    ['name: "Result Type"', 'name: "결과 유형"'],
    ['name: "Software Catalog"', 'name: "소프트웨어 카탈로그"'],
    ['name: "Documentation"', 'name: "문서"'],
    ['label: "Entity"', 'label: "엔티티"'],
    ['label: "Kind"', 'label: "종류"'],
    ['label: "Lifecycle"', 'label: "수명주기"'],
    ['values: ["Component", "Template"]', 'values: ["컴포넌트", "템플릿"]'],
  ],
  'node_modules/@backstage/plugin-search/dist/components/SearchType/SearchType.Tabs.esm.js':
    [['name: "All"', 'name: "전체"']],
  'node_modules/@backstage/plugin-search/dist/components/SearchType/SearchType.Accordion.esm.js':
    [['name: "All"', 'name: "전체"']],
  'node_modules/@backstage/plugin-search-react/dist/components/SearchBar/SearchBar.esm.js':
    [
      ['const ariaLabel = label ? void 0 : "Search";', 'const ariaLabel = label ? void 0 : "검색";'],
      ['const inputPlaceholder = placeholder ?? `Search in ${configApi.getOptionalString("app.title") || "Backstage"}`;', 'const inputPlaceholder = placeholder ?? `${configApi.getOptionalString("app.title") || "Backstage"}에서 검색`;'],
      ['"aria-label": "Query"', '"aria-label": "검색어"'],
      ['"aria-label": "Clear"', '"aria-label": "지우기"'],
      ['"Clear"', '"지우기"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/alpha.esm.js': [
    ['title: "APIs"', 'title: "API"'],
    ['defaultTitle: "Definition"', 'defaultTitle: "정의"'],
    ['defaultTitle: "APIs"', 'defaultTitle: "API"'],
  ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ApiExplorerPage/DefaultApiExplorerPage.esm.js':
    [
      ['title: "APIs"', 'title: "API"'],
      ['title: "Register Existing API"', 'title: "기존 API 등록"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ApiDefinitionCard/ApiDefinitionCard.esm.js':
    [
      ['label: "Raw"', 'label: "원본"'],
      ['Could not fetch the API', 'API를 가져올 수 없습니다'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ApiDefinitionDialog/ApiDefinitionDialog.esm.js':
    [
      ['label: "Raw"', 'label: "원본"'],
      [' ?? "Raw"', ' ?? "원본"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ApisCards/ConsumedApisCard.esm.js':
    [
      ['title: "Consumed APIs"', 'title: "소비 API"'],
      ['title: "Could not load APIs"', 'title: "API를 불러올 수 없습니다"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ApisCards/ProvidedApisCard.esm.js':
    [
      ['title: "Provided APIs"', 'title: "제공 API"'],
      ['title: "Could not load APIs"', 'title: "API를 불러올 수 없습니다"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ApisCards/HasApisCard.esm.js':
    [
      ['title: "APIs"', 'title: "API"'],
      ['title: "Could not load APIs"', 'title: "API를 불러올 수 없습니다"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ComponentsCards/ConsumingComponentsCard.esm.js':
    [
      ['title: "Consumers"', 'title: "사용 컴포넌트"'],
      ['title: "Could not load components"', 'title: "컴포넌트를 불러올 수 없습니다"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ComponentsCards/ProvidingComponentsCard.esm.js':
    [
      ['title: "Providers"', 'title: "제공 컴포넌트"'],
      ['title: "Could not load components"', 'title: "컴포넌트를 불러올 수 없습니다"'],
    ],
  'node_modules/@backstage/plugin-api-docs/dist/components/ApisCards/presets.esm.js':
    [
      ['title: "Type"', 'title: "유형"'],
      ['title: "API Definition"', 'title: "API 정의"'],
    ],
  'node_modules/@backstage/plugin-techdocs/dist/alpha.esm.js': [
    ['defaultTitle: "TechDocs"', 'defaultTitle: "기술 문서"'],
    ['title: "Docs"', 'title: "문서"'],
  ],
  'node_modules/@backstage/plugin-techdocs/dist/home/components/DefaultTechDocsHome.esm.js':
    [['Discover documentation in your ecosystem.', '조직의 문서를 탐색하세요.']],
  'node_modules/@backstage/plugin-techdocs/dist/home/components/TechDocsPageWrapper.esm.js':
    [['title: "Documentation"', 'title: "문서"']],
  'node_modules/@backstage/plugin-techdocs/dist/home/components/TechDocsCustomHome.esm.js':
    [
      ['title: "Could not load available documentation."', 'title: "사용 가능한 문서를 불러올 수 없습니다."'],
      ['Discover documentation in your ecosystem.', '조직의 문서를 탐색하세요.'],
    ],
  'node_modules/@backstage/plugin-techdocs/dist/home/components/Tables/columns.esm.js':
    [
      ['title: "Document"', 'title: "문서"'],
      ['title: "Owner"', 'title: "소유자"'],
      ['title: "Kind"', 'title: "종류"'],
      ['title: "Type"', 'title: "유형"'],
    ],
  'node_modules/@backstage/plugin-techdocs/dist/home/components/Grids/EntityListDocsGrid.esm.js':
    [
      ['title: "All Documentation"', 'title: "전체 문서"'],
      ['title: "Could not load available documentation."', 'title: "사용 가능한 문서를 불러올 수 없습니다."'],
    ],
  'node_modules/@backstage/plugin-techdocs/dist/home/components/Tables/DocsTable.esm.js':
    [['title: "No documents to show"', 'title: "표시할 문서가 없습니다"']],
  'node_modules/@backstage/plugin-techdocs/dist/home/components/Tables/EntityListDocsTable.esm.js':
    [['title: "Could not load available documentation."', 'title: "사용 가능한 문서를 불러올 수 없습니다."']],
  'node_modules/@backstage/plugin-techdocs/dist/reader/transformers/copyToClipboard.esm.js':
    [['title: "Copied to clipboard"', 'title: "클립보드에 복사됨"']],
  'node_modules/@backstage/plugin-techdocs/dist/reader/components/TechDocsReaderPageSubheader/TechDocsReaderPageSubheader.esm.js':
    [['title: "Settings"', 'title: "설정"']],
  'node_modules/@backstage/plugin-techdocs/dist/reader/components/TechDocsBuildLogs.esm.js':
    [['title: "Close the drawer"', 'title: "패널 닫기"']],
  'node_modules/@backstage/plugin-techdocs/dist/reader/components/TechDocsReaderPageHeader/TechDocsReaderPageHeader.esm.js':
    [
      ['label: "Owner"', 'label: "소유자"'],
      ['label: "Lifecycle"', 'label: "수명주기"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/alpha.esm.js':
    [['title: "Create..."', 'title: "생성"']],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateWizardPage/TemplateWizardPage.esm.js':
    [
      ['title: "Create a new component"', 'title: "새 컴포넌트 생성"'],
      [
        'subtitle: "Create new software components using standard templates in your organization"',
        'subtitle: "조직의 표준 템플릿으로 새 소프트웨어 컴포넌트를 생성하세요"',
      ],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/ListTasksPage/ListTasksPage.esm.js':
    [
      ['title: "No information to display"', 'title: "표시할 정보가 없습니다"'],
      ['title: "Tasks"', 'title: "작업"'],
      ['title: "Task ID"', 'title: "작업 ID"'],
      ['title: "Template"', 'title: "템플릿"'],
      ['title: "Created"', 'title: "생성일"'],
      ['title: "Owner"', 'title: "소유자"'],
      ['title: "Status"', 'title: "상태"'],
      ['title: "List template tasks"', 'title: "템플릿 작업 목록"'],
      ['subtitle: "All tasks that have been started"', 'subtitle: "시작된 모든 작업"'],
      ['pageTitleOverride: "Templates Tasks"', 'pageTitleOverride: "템플릿 작업"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/ActionsPage/ActionsPage.esm.js':
    [
      ['title: "No information to display"', 'title: "표시할 정보가 없습니다"'],
      ['title: "Installed actions"', 'title: "설치된 액션"'],
      ['subtitle: "This is the collection of all installed actions"', 'subtitle: "설치된 모든 액션 목록입니다"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/ListTasksPage/OwnerListPicker.esm.js':
    [
      ['name: "Task Owner"', 'name: "작업 소유자"'],
      ['label: "Owned"', 'label: "내 소유"'],
      ['label: "All"', 'label: "전체"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/EntityTagsPicker/EntityTagsPicker.esm.js':
    [['label: "Tags"', 'label: "태그"']],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/RepoUrlPicker/RepoUrlPickerHost.esm.js':
    [
      ['label: "Loading..."', 'label: "불러오는 중..."'],
      ['label: "Host"', 'label: "호스트"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/RepoUrlPicker/AzureRepoPicker.esm.js':
    [
      ['label: "Loading..."', 'label: "불러오는 중..."'],
      ['label: "Organization"', 'label: "조직"'],
      ['label: "Project"', 'label: "프로젝트"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/RepoUrlPicker/RepoUrlPickerRepoName.esm.js':
    [
      ['label: "Loading..."', 'label: "불러오는 중..."'],
      ['label: "Repositories Available"', 'label: "사용 가능한 저장소"'],
      ['label: "Repository"', 'label: "저장소"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/RepoUrlPicker/GithubRepoPicker.esm.js':
    [
      ['label: "Loading..."', 'label: "불러오는 중..."'],
      ['label: "Owner Available"', 'label: "사용 가능한 소유자"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/RepoUrlPicker/GiteaRepoPicker.esm.js':
    [
      ['label: "Loading..."', 'label: "불러오는 중..."'],
      ['label: "Owner Available"', 'label: "사용 가능한 소유자"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/RepoUrlPicker/GitlabRepoPicker.esm.js':
    [
      ['label: "Loading..."', 'label: "불러오는 중..."'],
      ['label: "Owner Available"', 'label: "사용 가능한 소유자"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/fields/RepoUrlPicker/BitbucketRepoPicker.esm.js':
    [
      ['label: "Allowed Workspaces"', 'label: "허용 워크스페이스"'],
      ['label: "Workspace"', 'label: "워크스페이스"'],
      ['label: "Allowed Projects"', 'label: "허용 프로젝트"'],
      ['label: "Project"', 'label: "프로젝트"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/CustomFieldExplorer.esm.js':
    [
      ['label: "Choose Custom Field Extension"', 'label: "커스텀 필드 확장 선택"'],
      ['"aria-label": "Close"', '"aria-label": "닫기"'],
      ['title: "Field Options"', 'title: "필드 옵션"'],
      ['title: "Example Template Spec"', 'title: "예시 템플릿 스펙"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/DryRunResults/DryRunResultsList.esm.js':
    [
      ['title: "Download as .zip"', 'title: ".zip으로 다운로드"'],
      ['title: "Delete result"', 'title: "결과 삭제"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/TemplateEditorPage.esm.js':
    [
      ['title: "Template Editor"', 'title: "템플릿 에디터"'],
      ['subtitle: "Edit, preview, and try out templates and template forms"', 'subtitle: "템플릿과 폼을 수정, 미리보기, 실행해볼 수 있습니다"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/TemplateEditorForm.esm.js':
    [['title: "Template Editor"', 'title: "템플릿 에디터"']],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/TemplateEditorBrowser.esm.js':
    [
      ['title: "Save all files"', 'title: "모든 파일 저장"'],
      ['title: "Reload directory"', 'title: "디렉토리 새로고침"'],
      ['title: "Close directory"', 'title: "디렉토리 닫기"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/TemplateEditorIntro.esm.js':
    [['title: "Only supported in some Chromium-based browsers"', 'title: "일부 Chromium 기반 브라우저에서만 지원됩니다"']],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/TemplateEditorTextArea.esm.js':
    [
      ['title: "Save file"', 'title: "파일 저장"'],
      ['title: "Reload file"', 'title: "파일 새로고침"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/DryRunResults/DryRunResultsView.esm.js':
    [
      ['label: "Files"', 'label: "파일"'],
      ['label: "Log"', 'label: "로그"'],
      ['label: "Output"', 'label: "출력"'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateEditorPage/TemplateFormPreviewer.esm.js':
    [['label: "Load Existing Template"', 'label: "기존 템플릿 불러오기"']],
  'node_modules/@backstage/plugin-scaffolder/dist/next/TemplateListPage/TemplateListPage.esm.js':
    [
      ['title: "Templates"', 'title: "템플릿"'],
      ['title: "Other Templates"', 'title: "기타 템플릿"'],
      ['pageTitleOverride: "Create a new component"', 'pageTitleOverride: "새 컴포넌트 생성"'],
      ['title: "Create a new component"', 'title: "새 컴포넌트 생성"'],
      [
        'subtitle: "Create new software components using standard templates in your organization"',
        'subtitle: "조직의 표준 템플릿으로 새 소프트웨어 컴포넌트를 생성하세요"',
      ],
      ['title: "Available Templates"', 'title: "사용 가능한 템플릿"'],
      ['title: "Register Existing Component"', 'title: "기존 컴포넌트 등록"'],
      ['text: "View TechDocs"', 'text: "TechDocs 보기"'],
      ['Create new software components using standard templates. Different templates create different kinds of components (services, websites, documentation, ...).', '표준 템플릿으로 새 소프트웨어 컴포넌트를 생성하세요. 템플릿마다 생성되는 컴포넌트 유형(서비스, 웹사이트, 문서 등)이 다릅니다.'],
    ],
  'node_modules/@backstage/plugin-scaffolder/dist/components/TemplateListPage/TemplateListPage.esm.js':
    [
      ['pageTitleOverride: "Create a new component"', 'pageTitleOverride: "새 컴포넌트 생성"'],
      ['text: "View TechDocs"', 'text: "TechDocs 보기"'],
      ['Create new software components using standard templates. Different templates create different kinds of components (services, websites, documentation, ...).', '표준 템플릿으로 새 소프트웨어 컴포넌트를 생성하세요. 템플릿마다 생성되는 컴포넌트 유형(서비스, 웹사이트, 문서 등)이 다릅니다.'],
    ],
  'node_modules/@backstage/plugin-catalog-graph/dist/components/CatalogGraphCard/CatalogGraphCard.esm.js':
    [['title: "View graph"', 'title: "그래프 보기"']],
  'node_modules/@backstage/plugin-catalog-graph/dist/components/CatalogGraphPage/CatalogGraphPage.esm.js':
    [
      ['title: "Catalog Graph"', 'title: "카탈로그 그래프"'],
      ['label: "Simplified"', 'label: "단순화"'],
      ['label: "Merge Relations"', 'label: "관계 병합"'],
    ],
  'node_modules/@backstage/plugin-catalog-graph/dist/components/CatalogGraphPage/CurveFilter.esm.js':
    [['label: "Curve"', 'label: "곡선"']],
  'node_modules/@backstage/plugin-catalog-graph/dist/components/CatalogGraphPage/DirectionFilter.esm.js':
    [['label: "Direction"', 'label: "방향"']],
  'node_modules/@backstage/plugin-catalog-graph/dist/components/EntityRelationsGraph/useEntityRelationNodesAndEdges.esm.js':
    [['label: "visible"', 'label: "표시"']],
};

const targetDirs = [
  'node_modules/@backstage/plugin-catalog-import/dist',
  'node_modules/@backstage/plugin-search/dist',
  'node_modules/@backstage/plugin-api-docs/dist',
  'node_modules/@backstage/plugin-techdocs/dist',
  'node_modules/@backstage/plugin-scaffolder/dist',
  'node_modules/@backstage/plugin-scaffolder-react/dist',
  'node_modules/@backstage/plugin-catalog-graph/dist',
];

const globalUiReplacements = [
  ['Create a new component', '새 컴포넌트 생성'],
  [
    'Create new software components using standard templates in your organization',
    '조직의 표준 템플릿으로 새 소프트웨어 컴포넌트를 생성하세요',
  ],
  ['Available Templates', '사용 가능한 템플릿'],
  ['Register Existing Component', '기존 컴포넌트 등록'],
  ['View TechDocs', 'TechDocs 보기'],
  ['No information to display', '표시할 정보가 없습니다'],
  ['Could not load available documentation.', '사용 가능한 문서를 불러올 수 없습니다.'],
];

function applyFileReplacements(filePath, pairs) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  let next = source;

  for (const [from, to] of pairs) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
    }
  }

  if (next !== source) {
    fs.writeFileSync(filePath, next, 'utf8');
  }
}

function walkFiles(dir, collector) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, collector);
    } else if (entry.isFile() && fullPath.endsWith('.esm.js')) {
      collector.push(fullPath);
    }
  }
}

function main() {
  const root = process.cwd();
  for (const [relativePath, pairs] of Object.entries(replacementsByFile)) {
    applyFileReplacements(path.resolve(root, relativePath), pairs);
  }

  const files = [];
  for (const dir of targetDirs) {
    walkFiles(path.resolve(root, dir), files);
  }
  for (const filePath of files) {
    applyFileReplacements(filePath, globalUiReplacements);
  }
}

main();
