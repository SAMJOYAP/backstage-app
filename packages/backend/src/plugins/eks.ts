import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { Router } from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type EksListClustersResponse = {
  clusters?: string[];
};

async function listClustersByRegion(region: string): Promise<string[]> {
  const { stdout } = await execFileAsync('aws', [
    'eks',
    'list-clusters',
    '--region',
    region,
    '--output',
    'json',
  ]);
  const parsed = JSON.parse(stdout) as EksListClustersResponse;
  return parsed.clusters ?? [];
}

export const eksPlugin = createBackendPlugin({
  pluginId: 'eks',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, config }) {
        const router = Router();

        router.get('/clusters', async (req, res) => {
          try {
            const queryRegion = String(req.query.region ?? '').trim();
            const queryRegions = String(req.query.regions ?? '')
              .split(',')
              .map(v => v.trim())
              .filter(Boolean);

            const configuredRegions =
              config.getOptionalStringArray('aws.eks.regions') ?? [];
            const fallbackRegion =
              process.env.AWS_REGION ||
              process.env.AWS_DEFAULT_REGION ||
              'ap-northeast-2';

            const regions = Array.from(
              new Set(
                [
                  ...queryRegions,
                  ...(queryRegion ? [queryRegion] : []),
                  ...configuredRegions,
                  fallbackRegion,
                ].filter(Boolean),
              ),
            );

            const perRegion = await Promise.all(
              regions.map(async region => {
                const names = await listClustersByRegion(region);
                return names.map(name => ({ name, region }));
              }),
            );

            const clusters = perRegion
              .flat()
              .sort((a, b) =>
                `${a.region}/${a.name}`.localeCompare(`${b.region}/${b.name}`),
              );

            res.json({ clusters, regions });
          } catch (error) {
            logger.error(`Failed to list EKS clusters: ${error}`);
            res.status(500).json({
              error: 'Failed to list EKS clusters',
              message:
                'aws cli execution failed. Check AWS credentials/role and awscli installation in backend pod.',
            });
          }
        });

        httpRouter.use(router);
      },
    });
  },
});

