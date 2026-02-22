import { Config } from '@backstage/config';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { examples } from './gitea-actions';
import { Logger } from 'winston';

import { ArgoService } from '@roadiehq/backstage-plugin-argo-cd-backend';

import { createRouter } from '@roadiehq/backstage-plugin-argo-cd-backend';
import { PluginEnvironment } from '../types';

async function createArgoApplicationWithoutPathValidation(options: {
  baseUrl: string;
  argoToken: string;
  appName: string;
  projectName: string;
  namespace: string;
  sourceRepo: string;
  sourcePath: string;
  labelValue: string;
}) {
  const {
    baseUrl,
    argoToken,
    appName,
    projectName,
    namespace,
    sourceRepo,
    sourcePath,
    labelValue,
  } = options;

  const payload = {
    metadata: {
      name: appName,
      labels: { 'backstage-name': labelValue },
      finalizers: ['resources-finalizer.argocd.argoproj.io'],
    },
    spec: {
      destination: {
        namespace,
        server: 'https://kubernetes.default.svc',
      },
      project: projectName,
      revisionHistoryLimit: 10,
      source: {
        path: sourcePath,
        repoURL: sourceRepo,
      },
      syncPolicy: {
        automated: {
          allowEmpty: true,
          prune: true,
          selfHeal: true,
        },
        retry: {
          backoff: {
            duration: '5s',
            factor: 2,
            maxDuration: '5m',
          },
          limit: 10,
        },
        syncOptions: ['CreateNamespace=false', 'FailOnSharedResource=true'],
      },
    },
  };

  const params = new URLSearchParams({
    validate: 'false',
    upsert: 'true',
  });

  const resp = await fetch(`${baseUrl}/api/v1/applications?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${argoToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Error creating argo app with validate=false: ${body}`);
  }
}

export default async function createPlugin({
  logger,
  config,
}: PluginEnvironment) {
  return await createRouter({ logger, config });
}

export function createArgoCDApp(options: { config: Config; logger: Logger }) {
  const { config, logger } = options;

  return createTemplateAction<{
    repoUrl: string;
    projectName?: string;
    appName: string;
    argoInstance: string;
    path: string;
    labelValue?: string;
    appNamespace: string;
  }>({
    id: 'cnoe:create-argocd-app',
    description: 'creates argocd app',
    examples,
    schema: {
      input: {
        type: 'object',
        required: [
          'repoUrl',
          'projectName',
          'appName',
          'argoInstance',
          'path',
          'appNamespace',
        ],
        properties: {
          repoUrl: {
            title: 'Repository Location',
            type: 'string',
          },
          projectName: {
            title: 'name of the project in argocd',
            type: 'string',
          },
          appName: {
            title: 'application name in argocd',
            type: 'string',
          },
          appNamespace: {
            title: 'application name in argocd',
            type: 'string',
          },
          argoInstance: {
            title: 'backstage argocd  instance name defined in app-config.yaml',
            type: 'string',
          },
          path: {
            title: 'argocd spec path',
            type: 'string',
          },
          labelValue: {
            title: 'for argocd plugin to locate this app',
            type: 'string',
          },
        },
      },
      output: {},
    },
    async handler(ctx) {
      const {
        repoUrl,
        projectName,
        appName,
        argoInstance,
        path,
        labelValue,
        appNamespace,
      } = ctx.input;

      const argoUserName =
        config.getOptionalString('argocd.username') ?? 'argocdUsername';
      const argoPassword =
        config.getOptionalString('argocd.password') ?? 'argocdPassword';

      const argoSvc = new ArgoService(
        argoUserName,
        argoPassword,
        config,
        logger,
      );

      const argocdConfig = config
        .getConfigArray('argocd.appLocatorMethods')
        .filter(element => element.getString('type') === 'config')
        .reduce(
          (acc: Config[], argoApp: Config) =>
            acc.concat(argoApp.getConfigArray('instances')),
          [],
        )
        .map(instance => ({
          name: instance.getString('name'),
          url: instance.getString('url'),
          token: instance.getOptionalString('token'),
          username: instance.getOptionalString('username'),
          password: instance.getOptionalString('password'),
        }));
      const matchedArgoInstance = argocdConfig.find(
        argoHost => argoHost.name === argoInstance,
      );
      if (!matchedArgoInstance) {
        throw new Error(`Unable to find Argo instance named "${argoInstance}"`);
      }
      const token =
        matchedArgoInstance.token ||
        (await argoSvc.getArgoToken(matchedArgoInstance));

      const resolvedProjectName = projectName ? projectName : appName;
      const resolvedLabelValue = labelValue ? labelValue : appName;

      try {
        await argoSvc.createArgoApplication({
          baseUrl: matchedArgoInstance.url,
          argoToken: token,
          appName: appName,
          projectName: resolvedProjectName,
          namespace: appNamespace,
          sourceRepo: repoUrl,
          sourcePath: path,
          labelValue: resolvedLabelValue,
        });
      } catch (e) {
        const errorText = e instanceof Error ? e.message : String(e);
        // GitOps bootstrap 전에 앱을 등록하면 path 검증에서 실패할 수 있어 fallback 처리
        if (
          errorText.includes('app path does not exist') ||
          errorText.includes('Unable to generate manifests in')
        ) {
          ctx.logger.warn(
            `Argo app path validation failed for "${appName}". Retrying with validate=false/upsert=true.`,
          );
          await createArgoApplicationWithoutPathValidation({
            baseUrl: matchedArgoInstance.url,
            argoToken: token,
            appName,
            projectName: resolvedProjectName,
            namespace: appNamespace,
            sourceRepo: repoUrl,
            sourcePath: path,
            labelValue: resolvedLabelValue,
          });
        } else {
          throw e;
        }
      }
    },
  });
}
