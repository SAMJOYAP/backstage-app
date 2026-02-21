import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import {
  catalogImportPlugin,
} from '@backstage/plugin-catalog-import';
import { catalogTranslationRef } from '@backstage/plugin-catalog/alpha';
import { catalogReactTranslationRef } from '@backstage/plugin-catalog-react/alpha';
import { ScaffolderPage, scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { orgPlugin } from '@backstage/plugin-org';
import { SearchPage } from '@backstage/plugin-search';
import { TechRadarPage } from '@backstage-community/plugin-tech-radar';
import {
  TechDocsIndexPage,
  techdocsPlugin,
  TechDocsReaderPage,
} from '@backstage/plugin-techdocs';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';
import { UserSettingsPage } from '@backstage/plugin-user-settings';
import { userSettingsTranslationRef } from '@backstage/plugin-user-settings/alpha';
import { createTranslationMessages } from '@backstage/core-plugin-api/alpha';
import { appLanguageApiRef } from '@backstage/core-plugin-api/alpha';
import { apis, keycloakOIDCAuthApiRef } from './apis';
import { entityPage } from './components/catalog/EntityPage';
import { searchPage } from './components/search/SearchPage';
import { KoreanCatalogImportPage } from './components/catalog-import/KoreanCatalogImportPage';
import { Root } from './components/Root';

import {
  AlertDisplay,
  OAuthRequestDialog,
  SignInPage,
} from '@backstage/core-components';
import { coreComponentsTranslationRef } from '@backstage/core-components/alpha';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { CatalogGraphPage } from '@backstage/plugin-catalog-graph';
import { RequirePermission } from '@backstage/plugin-permission-react';
import { catalogEntityCreatePermission } from '@backstage/plugin-catalog-common/alpha';
import LightIcon from '@material-ui/icons/WbSunny';
import {
  CNOEHomepage as ALREADY11Homepage,
  cnoeLightTheme as already11LightTheme,
  cnoeDarkTheme as already11DarkTheme,
} from '@internal/plugin-cnoe-ui';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { ArgoWorkflowsPage } from '@internal/plugin-argo-workflows';
import { ApacheSparkPage } from '@internal/plugin-apache-spark';
import { UnifiedThemeProvider } from '@backstage/theme';
import { TerraformPluginPage } from '@internal/plugin-terraform';
import {
  catalogKoreanMessages,
  catalogReactKoreanMessages,
  coreComponentsKoreanMessages,
  userSettingsKoreanMessages,
} from './translations/ko';

const app = createApp({
  apis,
  components: {
    SignInPage: props => {
      const configApi = useApi(configApiRef);
      if (configApi.getString('auth.environment') === 'local') {
        return <SignInPage {...props} auto providers={['guest']} />;
      }
      return (
        <SignInPage
          {...props}
          provider={{
            id: 'keycloak-oidc',
            title: '키클록',
            message: '키클록 계정으로 로그인',
            apiRef: keycloakOIDCAuthApiRef,
          }}
        />
      );
    },
  },
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
      viewTechDoc: techdocsPlugin.routes.docRoot,
      createFromTemplate: scaffolderPlugin.routes.selectedTemplate,
    });
    bind(apiDocsPlugin.externalRoutes, {
      registerApi: catalogImportPlugin.routes.importPage,
    });
    bind(scaffolderPlugin.externalRoutes, {
      registerComponent: catalogImportPlugin.routes.importPage,
      viewTechDoc: techdocsPlugin.routes.docRoot,
    });
    bind(orgPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
  },
  themes: [
    {
      id: 'already11-light-theme',
      title: '라이트 테마',
      variant: 'light',
      icon: <LightIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={already11LightTheme} children={children} />
      ),
    },
    {
      id: 'already11-dark-theme',
      title: '다크 테마',
      variant: 'dark',
      icon: <LightIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={already11DarkTheme} children={children} />
      ),
    },
  ],
  __experimentalTranslations: {
    defaultLanguage: 'ko',
    availableLanguages: ['ko', 'en'],
    resources: [
      createTranslationMessages({
        ref: catalogTranslationRef,
        full: false,
        messages: catalogKoreanMessages,
      }),
      createTranslationMessages({
        ref: catalogReactTranslationRef,
        full: false,
        messages: catalogReactKoreanMessages,
      }),
      createTranslationMessages({
        ref: userSettingsTranslationRef,
        full: false,
        messages: userSettingsKoreanMessages,
      }),
      createTranslationMessages({
        ref: coreComponentsTranslationRef,
        full: false,
        messages: coreComponentsKoreanMessages,
      }),
    ],
  },
});

const routes = (
  <FlatRoutes>
    <Route path="/" element={<Navigate to="home" />} />
    <Route path="/home" element={<ALREADY11Homepage />} />
    <Route path="/catalog" element={<CatalogIndexPage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {entityPage}
    </Route>
    <Route path="/docs" element={<TechDocsIndexPage />} />
    <Route
      path="/docs/:namespace/:kind/:name/*"
      element={<TechDocsReaderPage />}
    >
      <TechDocsAddons>
        <ReportIssue />
      </TechDocsAddons>
    </Route>
    <Route path="/create" element={<ScaffolderPage />} />
    <Route path="/api-docs" element={<ApiExplorerPage />} />
    <Route
      path="/tech-radar"
      element={<TechRadarPage width={1500} height={800} />}
    />
    <Route
      path="/catalog-import"
      element={
        <RequirePermission permission={catalogEntityCreatePermission}>
          <KoreanCatalogImportPage />
        </RequirePermission>
      }
    />
    <Route path="/search" element={<SearchPage />}>
      {searchPage}
    </Route>
    <Route path="/settings" element={<UserSettingsPage />} />
    <Route path="/catalog-graph" element={<CatalogGraphPage />} />
    <Route path="/argo-workflows" element={<ArgoWorkflowsPage />} />
    <Route path="/apache-spark" element={<ApacheSparkPage />} />
    <Route path="/terraform" element={<TerraformPluginPage />} />
  </FlatRoutes>
);

const ForceKoreanLanguage = () => {
  const appLanguageApi = useApi(appLanguageApiRef);

  React.useEffect(() => {
    appLanguageApi.setLanguage('ko');
  }, [appLanguageApi]);

  return null;
};

export default app.createRoot(
  <>
    <ForceKoreanLanguage />
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
