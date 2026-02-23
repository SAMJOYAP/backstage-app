import { Config } from '@backstage/config';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { executeShellCommand } from '@backstage/plugin-scaffolder-node';
import { examples } from './gitea-actions';
import { Logger } from 'winston';

import { ArgoService } from '@roadiehq/backstage-plugin-argo-cd-backend';

import { createRouter } from '@roadiehq/backstage-plugin-argo-cd-backend';
import { PluginEnvironment } from '../types';
import { Writable } from 'stream';

class CaptureLogStream extends Writable {
  data = '';

  _write(chunk: any, _: any, callback: any) {
    this.data += chunk.toString();
    callback();
  }
}

async function createArgoApplicationWithoutPathValidation(options: {
  baseUrl: string;
  argoToken: string;
  appName: string;
  projectName: string;
  namespace: string;
  destinationServer: string;
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
    destinationServer,
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
        server: destinationServer,
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

type EksClusterConnectionInfo = {
  endpoint: string;
  caData: string;
};

async function getEksClusterConnectionInfo(options: {
  clusterName: string;
  region: string;
}): Promise<EksClusterConnectionInfo> {
  const { clusterName, region } = options;
  const logStream = new CaptureLogStream();

  const command = [
    'if ! command -v aws >/dev/null 2>&1; then',
    '  echo "aws cli is not installed in backend pod";',
    '  exit 1;',
    'fi',
    `ENDPOINT=$(aws eks describe-cluster --name "${clusterName}" --region "${region}" --query 'cluster.endpoint' --output text)`,
    `CA_DATA=$(aws eks describe-cluster --name "${clusterName}" --region "${region}" --query 'cluster.certificateAuthority.data' --output text)`,
    'echo "ENDPOINT=${ENDPOINT}"',
    'echo "CA_DATA=${CA_DATA}"',
  ].join('\n');

  await executeShellCommand({
    command: 'bash',
    args: ['-lc', command],
    logStream,
  });

  const raw = logStream.data.trim();
  const endpointLine = raw
    .split('\n')
    .find(line => line.trim().startsWith('ENDPOINT='));
  const caLine = raw.split('\n').find(line => line.trim().startsWith('CA_DATA='));
  const endpoint = endpointLine?.replace(/^ENDPOINT=/, '').trim() ?? '';
  const caData = caLine?.replace(/^CA_DATA=/, '').trim() ?? '';

  const invalidCa =
    !caData ||
    caData.toLowerCase() === 'none' ||
    caData.toLowerCase() === 'null';
  if (!endpoint.startsWith('https://')) {
    throw new Error(
      `Unable to resolve endpoint for EKS cluster "${clusterName}" in region "${region}". Raw output: ${raw}`,
    );
  }
  if (invalidCa) {
    throw new Error(
      `Unable to resolve certificateAuthority for EKS cluster "${clusterName}" in region "${region}". Raw output: ${raw}`,
    );
  }

  return { endpoint, caData };
}

type ArgoClusterRef = {
  name: string;
  server: string;
};

type ArgoProjectRef = {
  name: string;
};

async function listArgoClusters(options: {
  baseUrl: string;
  argoToken: string;
}): Promise<ArgoClusterRef[]> {
  const { baseUrl, argoToken } = options;
  const resp = await fetch(`${baseUrl}/api/v1/clusters`, {
    headers: {
      Authorization: `Bearer ${argoToken}`,
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to list Argo CD clusters: ${body}`);
  }

  const parsed = await resp.json();
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  return items.map((item: any): ArgoClusterRef => ({
    name: item?.name ?? '',
    server: item?.server ?? '',
  }));
}

async function listArgoProjects(options: {
  baseUrl: string;
  argoToken: string;
}): Promise<ArgoProjectRef[]> {
  const { baseUrl, argoToken } = options;
  const resp = await fetch(`${baseUrl}/api/v1/projects`, {
    headers: {
      Authorization: `Bearer ${argoToken}`,
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to list Argo CD projects: ${body}`);
  }

  const parsed = await resp.json();
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  return items.map((item: any): ArgoProjectRef => ({
    name: item?.metadata?.name ?? '',
  }));
}

async function argoApplicationExists(options: {
  baseUrl: string;
  argoToken: string;
  appName: string;
}): Promise<boolean> {
  const { baseUrl, argoToken, appName } = options;
  const resp = await fetch(
    `${baseUrl}/api/v1/applications/${encodeURIComponent(appName)}`,
    {
      headers: {
        Authorization: `Bearer ${argoToken}`,
      },
    },
  );
  if (resp.status === 404) {
    return false;
  }
  if (resp.status === 403) {
    const body = await resp.text();
    // Argo can return 403 for non-existent apps on direct GET.
    // Fall back to list-based lookup to avoid false RBAC failures.
    if (isArgoPermissionDenied(body)) {
      const listResp = await fetch(`${baseUrl}/api/v1/applications`, {
        headers: {
          Authorization: `Bearer ${argoToken}`,
        },
      });
      if (listResp.ok) {
        const parsed = await listResp.json();
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        return items.some((item: any) => item?.metadata?.name === appName);
      }
    }
    throw new Error(`Failed to check Argo CD application existence: ${body}`);
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to check Argo CD application existence: ${body}`);
  }
  return true;
}

function isArgoPermissionDenied(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes('permission denied') ||
    lowered.includes('"code":7') ||
    lowered.includes('code = permissiondenied')
  );
}

function throwArgoRbacError(message: string): never {
  throw new Error(
    [
      'Argo CD RBAC 권한이 부족하여 안전한 사전 검증을 완료할 수 없습니다.',
      message,
      '필요 권한: applications(get/list), projects(get/list), clusters(get/list), clusters(create: 비허브 자동등록 시).',
    ].join(' '),
  );
}

function normalizeEksClusterName(value?: string): string {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const arnMatch = trimmed.match(/^arn:aws:eks:[^:]+:\d+:cluster\/(.+)$/i);
  const normalized = (arnMatch?.[1] ?? trimmed).trim().toLowerCase();
  return normalized;
}

function isHubClusterDestination(options: {
  destinationEksClusterName?: string;
  hubClusterName: string;
}): boolean {
  const destination = normalizeEksClusterName(options.destinationEksClusterName);
  const hub = normalizeEksClusterName(options.hubClusterName);
  return Boolean(destination) && Boolean(hub) && destination === hub;
}

async function registerArgoEksCluster(options: {
  baseUrl: string;
  argoToken: string;
  clusterName: string;
  endpoint: string;
  caData: string;
}): Promise<void> {
  const { baseUrl, argoToken, clusterName, endpoint, caData } = options;
  const payload = {
    name: clusterName,
    server: endpoint,
    config: {
      tlsClientConfig: {
        insecure: false,
        caData,
      },
      awsAuthConfig: {
        clusterName,
      },
    },
  };

  const resp = await fetch(`${baseUrl}/api/v1/clusters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${argoToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (resp.status === 409) {
    return;
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to register EKS cluster in Argo CD: ${body}`);
  }
}

async function deleteArgoApplication(options: {
  baseUrl: string;
  argoToken: string;
  appName: string;
  logger: Logger;
}) {
  const { baseUrl, argoToken, appName, logger } = options;
  const deleteUrl = `${baseUrl}/api/v1/applications/${encodeURIComponent(
    appName,
  )}?cascade=true&propagationPolicy=foreground`;
  const resp = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${argoToken}`,
    },
  });
  if (resp.status === 404) {
    logger.info(`Argo app "${appName}" not found during cleanup`);
    return;
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Argo app cleanup failed: ${body}`);
  }
}

async function deleteGithubRepo(options: {
  config: Config;
  owner: string;
  repo: string;
  logger: Logger;
}) {
  const { config, owner, repo, logger } = options;
  const githubIntegrations = config.getOptionalConfigArray('integrations.github') ?? [];
  const token =
    githubIntegrations
      .map(integration => integration.getOptionalString('token'))
      .find((value): value is string => Boolean(value)) ?? '';
  if (!token) {
    logger.warn(
      'Skipping GitHub cleanup: no github integration token configured in app-config',
    );
    return;
  }

  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (resp.status === 404) {
    logger.info(`GitHub repo "${owner}/${repo}" not found during cleanup`);
    return;
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GitHub cleanup failed: ${body}`);
  }
}

async function deleteEcrRepo(options: {
  repository: string;
  region?: string;
  logger: Logger;
}) {
  const { repository, region, logger } = options;
  const logStream = new CaptureLogStream();
  const regionArg = region ? ` --region ${region}` : '';

  const command = [
    'if ! command -v aws >/dev/null 2>&1; then',
    '  echo "Skipping ECR cleanup: aws cli not installed";',
    '  exit 0;',
    'fi',
    `aws ecr delete-repository --repository-name "${repository}" --force${regionArg}`,
  ].join('\n');

  try {
    await executeShellCommand({
      command: 'bash',
      args: ['-lc', command],
      logStream,
    });
  } catch (error) {
    logger.warn(
      `ECR cleanup best-effort failed for "${repository}": ${String(error)}`,
    );
    if (logStream.data) {
      logger.warn(logStream.data);
    }
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
    destinationEksClusterName?: string;
    destinationEksClusterRegion?: string;
    destinationServer?: string;
    cleanupOnFailure?: boolean;
    cleanupGithubOwner?: string;
    cleanupGithubRepo?: string;
    cleanupEcrRepository?: string;
    cleanupEcrRegion?: string;
    preflightOnly?: boolean;
    hubClusterName?: string;
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
          destinationEksClusterName: {
            title: 'target EKS cluster name for ArgoCD destination',
            type: 'string',
          },
          destinationEksClusterRegion: {
            title: 'aws region for target EKS cluster',
            type: 'string',
          },
          destinationServer: {
            title: 'target Kubernetes API server URL for ArgoCD destination',
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
          cleanupOnFailure: {
            title: 'cleanup created resources when this step fails',
            type: 'boolean',
          },
          cleanupGithubOwner: {
            title: 'github owner to delete on cleanup',
            type: 'string',
          },
          cleanupGithubRepo: {
            title: 'github repository to delete on cleanup',
            type: 'string',
          },
          cleanupEcrRepository: {
            title: 'ecr repository name to delete on cleanup',
            type: 'string',
          },
          cleanupEcrRegion: {
            title: 'aws region for ecr cleanup',
            type: 'string',
          },
          preflightOnly: {
            title: 'run validation only and skip argocd app creation',
            type: 'boolean',
          },
          hubClusterName: {
            title: 'hub EKS cluster name (skip EKS validation when destination matches)',
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
        destinationEksClusterName,
        destinationEksClusterRegion,
        destinationServer,
        cleanupOnFailure,
        cleanupGithubOwner,
        cleanupGithubRepo,
        cleanupEcrRepository,
        cleanupEcrRegion,
        preflightOnly,
        hubClusterName,
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
      const shouldCleanup = cleanupOnFailure ?? true;
      const validateOnly = preflightOnly ?? false;
      const configuredHubClusterName =
        config.getOptionalString('aws.eks.hubClusterName') ?? 'sesac-ref-impl';
      const effectiveHubClusterName = hubClusterName ?? configuredHubClusterName;
      const destinationIsHub =
        Boolean(destinationEksClusterName) &&
        isHubClusterDestination({
          destinationEksClusterName,
          hubClusterName: effectiveHubClusterName,
        });
      let resolvedDestinationServer =
        destinationServer ?? 'https://kubernetes.default.svc';

      if (destinationIsHub) {
        ctx.logger.info(
          `Hub cluster fast-path enabled for "${destinationEksClusterName}". Skipping Argo preflight RBAC checks and using in-cluster destination.`,
        );
      } else {
        let appExists = false;
        try {
          appExists = await argoApplicationExists({
            baseUrl: matchedArgoInstance.url,
            argoToken: token,
            appName,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (isArgoPermissionDenied(message)) {
            throwArgoRbacError(
              `기존 Application 중복 확인 실패(app="${appName}"). token에 applications get/list 권한을 부여하세요.`,
            );
          } else {
            throw error;
          }
        }
        if (appExists) {
          throw new Error(
            `Argo CD application "${appName}" already exists in instance "${argoInstance}". Use a different app name or remove existing application first.`,
          );
        }
        try {
          const argoProjects = await listArgoProjects({
            baseUrl: matchedArgoInstance.url,
            argoToken: token,
          });
          const hasProject = argoProjects.some(
            (project: ArgoProjectRef) => project.name === resolvedProjectName,
          );
          if (!hasProject) {
            throw new Error(
              `Argo CD project "${resolvedProjectName}" does not exist in instance "${argoInstance}".`,
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (isArgoPermissionDenied(message)) {
            throwArgoRbacError(
              `Argo CD Project 검증 실패(project="${resolvedProjectName}"). token에 projects get/list 권한을 부여하세요.`,
            );
          } else {
            throw error;
          }
        }
      }

      if (destinationEksClusterName) {
        if (destinationIsHub) {
          ctx.logger.info(
            `Hub cluster "${destinationEksClusterName}" selected; skipping EKS lookup/registration and using in-cluster destination.`,
          );
          resolvedDestinationServer = 'https://kubernetes.default.svc';
        } else {
          const region = destinationEksClusterRegion ?? 'ap-northeast-2';
          const { endpoint, caData } = await getEksClusterConnectionInfo({
            clusterName: destinationEksClusterName,
            region,
          });
          let clusterExists = false;
          try {
            const argoClusters = await listArgoClusters({
              baseUrl: matchedArgoInstance.url,
              argoToken: token,
            });
            clusterExists = argoClusters.some(
              (cluster: ArgoClusterRef) =>
                cluster.server === endpoint ||
                cluster.name === destinationEksClusterName,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (isArgoPermissionDenied(message)) {
              throwArgoRbacError(
                `EKS Cluster 조회 실패(cluster="${destinationEksClusterName}"). token에 clusters get/list 권한을 부여하세요.`,
              );
            } else {
              throw error;
            }
          }
          if (!clusterExists) {
            ctx.logger.info(
              `Argo CD cluster registration not found for "${destinationEksClusterName}". Trying auto-register.`,
            );
            try {
              await registerArgoEksCluster({
                baseUrl: matchedArgoInstance.url,
                argoToken: token,
                clusterName: destinationEksClusterName,
                endpoint,
                caData,
              });
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              if (isArgoPermissionDenied(message)) {
                throwArgoRbacError(
                  `EKS Cluster 자동등록 실패(cluster="${destinationEksClusterName}"). token에 clusters create 권한을 부여하세요.`,
                );
              } else {
                throw error;
              }
            }
            try {
              const refreshedClusters = await listArgoClusters({
                baseUrl: matchedArgoInstance.url,
                argoToken: token,
              });
              const existsAfterRegister = refreshedClusters.some(
                (cluster: ArgoClusterRef) =>
                  cluster.server === endpoint ||
                  cluster.name === destinationEksClusterName,
              );
              if (!existsAfterRegister) {
                ctx.logger.warn(
                  `Cluster "${destinationEksClusterName}" is not visible in Argo cluster list after register attempt.`,
                );
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              if (isArgoPermissionDenied(message)) {
                throwArgoRbacError(
                  `EKS Cluster 등록 후 검증 실패(cluster="${destinationEksClusterName}"). token에 clusters get/list 권한을 부여하세요.`,
                );
              } else {
                throw error;
              }
            }
          }
          resolvedDestinationServer = endpoint;
        }
      }

      if (validateOnly) {
        ctx.logger.info(
          `Preflight passed for app "${appName}" on Argo instance "${argoInstance}"`,
        );
        return;
      }
      const useCustomDestination =
        resolvedDestinationServer !== 'https://kubernetes.default.svc';

      try {
        if (useCustomDestination) {
          await createArgoApplicationWithoutPathValidation({
            baseUrl: matchedArgoInstance.url,
            argoToken: token,
            appName,
            projectName: resolvedProjectName,
            namespace: appNamespace,
            destinationServer: resolvedDestinationServer,
            sourceRepo: repoUrl,
            sourcePath: path,
            labelValue: resolvedLabelValue,
          });
        } else {
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
        }
      } catch (e) {
        const errorText = e instanceof Error ? e.message : String(e);
        // If the app is registered before GitOps bootstrap, path validation can fail, so retry with fallback settings.
        if (
          !useCustomDestination &&
          errorText.includes('app path does not exist') ||
          (!useCustomDestination &&
          errorText.includes('Unable to generate manifests in')
          )
        ) {
          ctx.logger.warn(
            `Argo app path validation failed for "${appName}". Retrying with validate=false/upsert=true.`,
          );
          try {
            await createArgoApplicationWithoutPathValidation({
              baseUrl: matchedArgoInstance.url,
              argoToken: token,
              appName,
              projectName: resolvedProjectName,
              namespace: appNamespace,
              destinationServer: resolvedDestinationServer,
              sourceRepo: repoUrl,
              sourcePath: path,
              labelValue: resolvedLabelValue,
            });
          } catch (fallbackError) {
            if (shouldCleanup) {
              ctx.logger.warn(
                `Fallback creation failed. Starting cleanup for app "${appName}"`,
              );
              try {
                await deleteArgoApplication({
                  baseUrl: matchedArgoInstance.url,
                  argoToken: token,
                  appName,
                  logger,
                });
              } catch (cleanupError) {
                ctx.logger.warn(String(cleanupError));
              }
              if (cleanupGithubOwner && cleanupGithubRepo) {
                try {
                  await deleteGithubRepo({
                    config,
                    owner: cleanupGithubOwner,
                    repo: cleanupGithubRepo,
                    logger,
                  });
                } catch (cleanupError) {
                  ctx.logger.warn(String(cleanupError));
                }
              }
              if (cleanupEcrRepository) {
                await deleteEcrRepo({
                  repository: cleanupEcrRepository,
                  region: cleanupEcrRegion,
                  logger,
                });
              }
            }
            throw fallbackError;
          }
        } else {
          if (shouldCleanup) {
            ctx.logger.warn(
              `create-argocd-app failed. Starting cleanup for app "${appName}"`,
            );
            try {
              await deleteArgoApplication({
                baseUrl: matchedArgoInstance.url,
                argoToken: token,
                appName,
                logger,
              });
            } catch (cleanupError) {
              ctx.logger.warn(String(cleanupError));
            }
            if (cleanupGithubOwner && cleanupGithubRepo) {
              try {
                await deleteGithubRepo({
                  config,
                  owner: cleanupGithubOwner,
                  repo: cleanupGithubRepo,
                  logger,
                });
              } catch (cleanupError) {
                ctx.logger.warn(String(cleanupError));
              }
            }
            if (cleanupEcrRepository) {
              await deleteEcrRepo({
                repository: cleanupEcrRepository,
                region: cleanupEcrRegion,
                logger,
              });
            }
          }
          throw e;
        }
      }
    },
  });
}
