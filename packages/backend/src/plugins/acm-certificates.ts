import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { Router } from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type AcmCertificateSummary = {
  CertificateArn?: string;
  DomainName?: string;
};

type AcmListCertificatesResponse = {
  CertificateSummaryList?: AcmCertificateSummary[];
};

type CertificateItem = {
  arn: string;
  domainName: string;
};

function matchesDomainSuffix(domainName: string, suffix: string): boolean {
  const domain = domainName.toLowerCase();
  const normalizedSuffix = suffix.toLowerCase();
  return (
    domain === normalizedSuffix ||
    domain === `*.${normalizedSuffix}` ||
    domain.endsWith(`.${normalizedSuffix}`)
  );
}

async function listCertificatesByRegion(
  region: string,
  statuses: string[],
): Promise<CertificateItem[]> {
  const args = [
    'acm',
    'list-certificates',
    '--region',
    region,
    '--output',
    'json',
  ];

  if (statuses.length > 0) {
    args.push('--certificate-statuses', ...statuses);
  }

  const { stdout } = await execFileAsync('aws', args);
  const parsed = JSON.parse(stdout) as AcmListCertificatesResponse;
  const summaries = parsed.CertificateSummaryList ?? [];

  return summaries
    .map(summary => ({
      arn: summary.CertificateArn ?? '',
      domainName: summary.DomainName ?? '',
    }))
    .filter(item => item.arn && item.domainName);
}

export const acmCertificatesPlugin = createBackendPlugin({
  pluginId: 'acm-certificates',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ httpRouter, logger }) {
        const router = Router();

        router.get('/certificates', async (req, res) => {
          try {
            const region = String(
              req.query.region ??
                process.env.AWS_REGION ??
                process.env.AWS_DEFAULT_REGION ??
                'ap-northeast-2',
            ).trim();
            const domainSuffix = String(req.query.domainSuffix ?? '').trim();
            const statuses = String(req.query.statuses ?? 'ISSUED')
              .split(',')
              .map(v => v.trim())
              .filter(Boolean);

            const certificates = await listCertificatesByRegion(
              region,
              statuses,
            );

            const filtered =
              domainSuffix.length > 0
                ? certificates.filter(cert =>
                    matchesDomainSuffix(cert.domainName, domainSuffix),
                  )
                : certificates;

            filtered.sort((a, b) =>
              `${a.domainName}|${a.arn}`.localeCompare(
                `${b.domainName}|${b.arn}`,
              ),
            );

            res.json({
              region,
              statuses,
              domainSuffix,
              certificates: filtered,
            });
          } catch (error) {
            logger.error(`Failed to list ACM certificates: ${error}`);
            res.status(500).json({
              error: 'Failed to list ACM certificates',
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
