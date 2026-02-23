import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { Router } from 'express';

type ArgoInstance = {
  name: string;
  url: string;
  token?: string;
  username?: string;
  password?: string;
};

async function getArgoToken(instance: ArgoInstance): Promise<string> {
  if (instance.token) {
    return instance.token;
  }
  if (!instance.username || !instance.password) {
    throw new Error(
      `Argo instance "${instance.name}" has no token and no username/password configured`,
    );
  }

  const resp = await fetch(`${instance.url}/api/v1/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: instance.username,
      password: instance.password,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to create Argo session: ${body}`);
  }

  const parsed = (await resp.json()) as { token?: string };
  if (!parsed.token) {
    throw new Error('Argo session response has no token');
  }
  return parsed.token;
}

function getConfiguredInstances(config: Config): ArgoInstance[] {
  return config
    .getConfigArray('argocd.appLocatorMethods')
    .filter(method => method.getString('type') === 'config')
    .flatMap(method => method.getConfigArray('instances'))
    .map(instance => ({
      name: instance.getString('name'),
      url: instance.getString('url'),
      token: instance.getOptionalString('token'),
      username: instance.getOptionalString('username'),
      password: instance.getOptionalString('password'),
    }));
}

async function listProjects(instance: ArgoInstance): Promise<string[]> {
  const token = await getArgoToken(instance);
  const resp = await fetch(`${instance.url}/api/v1/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to list Argo projects: ${body}`);
  }

  const parsed = (await resp.json()) as {
    items?: Array<{ metadata?: { name?: string } }>;
  };
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items
    .map(item => item?.metadata?.name ?? '')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export const argoCdProjectsPlugin = createBackendPlugin({
  pluginId: 'argocd-projects',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, config }) {
        const router = Router();

        router.get('/projects', async (req, res) => {
          try {
            const requestedInstance = String(
              req.query.argoInstance ?? 'in-cluster',
            ).trim();
            const instances = getConfiguredInstances(config);
            const targetInstance =
              instances.find(instance => instance.name === requestedInstance) ??
              instances[0];

            if (!targetInstance) {
              throw new Error(
                `No Argo CD instance configured. Expected instance: "${requestedInstance}"`,
              );
            }

            const projects = await listProjects(targetInstance);
            res.json({
              argoInstance: targetInstance.name,
              projects,
            });
          } catch (error) {
            logger.error(`Failed to list Argo CD projects: ${error}`);
            res.status(500).json({
              error: 'Failed to list Argo CD projects',
              message:
                'Unable to fetch Argo CD projects from backend. Check Argo CD credentials and connectivity.',
            });
          }
        });

        httpRouter.use(router);
      },
    });
  },
});
