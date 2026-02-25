import React from 'react';
import { RELATION_OWNED_BY } from '@backstage/catalog-model';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import { useRouteRef } from '@backstage/core-plugin-api';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { getEntityRelations, EntityRefLinks, FavoriteEntity } from '@backstage/plugin-catalog-react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Link as RouterLink } from 'react-router-dom';
import AppsIcon from '@material-ui/icons/Apps';
import StorageIcon from '@material-ui/icons/Storage';
import UserIcon from '@material-ui/icons/AccountCircle';

const useStyles = makeStyles(theme => ({
  card: {
    height: 280,
    borderTop: '4px solid var(--template-color)',
    borderRadius: 12,
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 8px 20px rgba(0, 0, 0, 0.45)'
        : '0 6px 16px rgba(15, 23, 42, 0.08)',
    backgroundColor: theme.palette.background.paper,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    height: 276,
    padding: '16px 16px 14px 16px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    flex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--template-color)',
    background:
      theme.palette.type === 'dark'
        ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(30, 41, 59, 0.9))'
        : 'linear-gradient(180deg, #ffffff, #f8fafc)',
    border:
      theme.palette.type === 'dark'
        ? '1px solid rgba(148, 163, 184, 0.35)'
        : '1px solid #dbeafe',
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 4px 12px rgba(2, 6, 23, 0.45)'
        : '0 4px 12px rgba(15, 23, 42, 0.08)',
  },
  iconImage: {
    width: 28,
    height: 28,
    objectFit: 'contain',
    filter:
      theme.palette.type === 'dark'
        ? 'drop-shadow(0 1px 2px rgba(15, 23, 42, 0.55))'
        : 'none',
  },
  title: {
    fontWeight: 700,
    lineHeight: 1.35,
    color: theme.palette.text.primary,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  description: {
    color: theme.palette.text.secondary,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: 1.5,
    minHeight: 66,
    maxHeight: 66,
  },
  chipRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 'auto',
  },
  ownerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: theme.palette.text.secondary,
    minHeight: 22,
    fontSize: 13,
  },
  favoriteWrap: {
    marginTop: -2,
    color: theme.palette.text.secondary,
  },
}));

const terraformLogo = 'https://cdn.simpleicons.org/terraform';

const logoMap: Record<string, { src: string; alt: string }> = {
  nodejs: { src: 'https://cdn.simpleicons.org/nodedotjs', alt: 'Node.js' },
  java: { src: 'https://cdn.simpleicons.org/openjdk', alt: 'OpenJDK' },
  terraform: { src: terraformLogo, alt: 'Terraform' },
  eks: {
    src: 'https://icon.icepanel.io/AWS/svg/Containers/Elastic-Kubernetes-Service.svg',
    alt: 'Amazon EKS',
  },
  ec2: { src: 'https://icon.icepanel.io/AWS/svg/Compute/EC2.svg', alt: 'Amazon EC2' },
  rds: {
    src: 'https://icon.icepanel.io/AWS/svg/Database/Relational-Database-Service.svg',
    alt: 'Amazon RDS',
  },
  dynamodb: {
    src: 'https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg',
    alt: 'Amazon DynamoDB',
  },
  s3: {
    src: 'https://icon.icepanel.io/AWS/svg/Storage/Simple-Storage-Service.svg',
    alt: 'Amazon S3',
  },
  elasticache: {
    src: 'https://icon.icepanel.io/AWS/svg/Database/ElastiCache.svg',
    alt: 'Amazon ElastiCache',
  },
  datapipeline: {
    src: terraformLogo,
    alt: 'AWS Data Pipeline',
  },
  golang: { src: 'https://cdn.simpleicons.org/go', alt: 'Go' },
  workflow: { src: 'https://cdn.simpleicons.org/argo', alt: 'Argo Workflows' },
  kubernetes: { src: 'https://cdn.simpleicons.org/kubernetes', alt: 'Kubernetes' },
  ray: { src: 'https://cdn.simpleicons.org/ray', alt: 'Ray' },
} as const;

const fallbackTemplateMeta: Record<
  string,
  { icon: keyof typeof logoMap; color: string; stack: string }
> = {
  'nodejs-nginx-webapp': { icon: 'nodejs', color: '#3C873A', stack: 'Node.js' },
  'springboot-gradle-apache': { icon: 'java', color: '#EA6A47', stack: 'Java' },
  'terraform-eks': { icon: 'eks', color: '#0EA5E9', stack: 'EKS' },
  'terraform-ec2': { icon: 'ec2', color: '#F59E0B', stack: 'EC2' },
  'terraform-rds': { icon: 'rds', color: '#2563EB', stack: 'RDS' },
  'terraform-dynamodb': {
    icon: 'dynamodb',
    color: '#7C3AED',
    stack: 'DynamoDB',
  },
  'terraform-s3': { icon: 's3', color: '#0284C7', stack: 'S3' },
  'terraform-elasticache': {
    icon: 'elasticache',
    color: '#DC2626',
    stack: 'ElastiCache',
  },
  'terraform-data-pipeline': {
    icon: 'datapipeline',
    color: '#0D9488',
    stack: 'Data Pipeline',
  },
  'app-with-aws-resources': { icon: 'golang', color: '#14B8A6', stack: 'Go' },
  'argo-workflows-basic': {
    icon: 'workflow',
    color: '#F97316',
    stack: 'Argo Workflows',
  },
  basic: { icon: 'kubernetes', color: '#0EA5E9', stack: 'Kubernetes' },
  'ray-serve-kubernetes': { icon: 'ray', color: '#7C3AED', stack: 'Ray' },
};

export const TemplateStackCard = ({
  template,
}: {
  template: TemplateEntityV1beta3;
}) => {
  const classes = useStyles();
  const toTemplate = useRouteRef(scaffolderPlugin.routes.selectedTemplate);
  const fallback = fallbackTemplateMeta[template.metadata.name];

  const iconKey =
    template.metadata.annotations?.['sesac.io/template-icon']?.toLowerCase() ??
    fallback?.icon ??
    '';
  const color =
    template.metadata.annotations?.['sesac.io/template-color'] ??
    fallback?.color ??
    '#64748b';
  const stackLabel =
    template.metadata.annotations?.['sesac.io/template-stack'] ??
    fallback?.stack ??
    'Template';

  const logo = logoMap[iconKey as keyof typeof logoMap];
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);
  const Icon = template.spec.type === 'infrastructure' ? StorageIcon : AppsIcon;

  const namespace = template.metadata.namespace ?? 'default';
  const title = template.metadata.title ?? template.metadata.name;
  const description = template.metadata.description ?? '템플릿 설명이 없습니다.';
  const ownerRefs = getEntityRelations(template, RELATION_OWNED_BY);
  const templateType = template.spec.type ?? 'template';
  const typeChipColor =
    templateType === 'infrastructure' ? '#0891B2' : '#16A34A';
  const typeChipBg =
    templateType === 'infrastructure' ? '#0891B222' : '#16A34A22';

  return (
    <Card
      className={classes.card}
      style={{ ['--template-color' as string]: color }}
      elevation={2}
    >
      <CardActionArea
        component={RouterLink}
        to={toTemplate({
          namespace,
          templateName: template.metadata.name,
        })}
      >
        <CardContent className={classes.content}>
          <Box className={classes.topRow}>
            <Box className={classes.iconWrap}>
              {logo && !imageLoadFailed ? (
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className={classes.iconImage}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImageLoadFailed(true)}
                />
              ) : (
                <Icon fontSize="small" />
              )}
            </Box>
            <Box className={classes.titleRow}>
              <Typography variant="h6" className={classes.title}>
                {title}
              </Typography>
              <Box
                className={classes.favoriteWrap}
                onMouseDown={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <FavoriteEntity entity={template} style={{ padding: 0 }} />
              </Box>
            </Box>
          </Box>
          <Typography variant="body2" className={classes.description}>
            {description}
          </Typography>
          <Box className={classes.chipRow}>
            <Chip
              size="small"
              label={stackLabel}
              style={{ backgroundColor: `${color}22`, color }}
            />
            <Chip
              size="small"
              label={templateType}
              style={{ backgroundColor: typeChipBg, color: typeChipColor }}
            />
          </Box>
          <Box className={classes.ownerRow}>
            {ownerRefs.length > 0 ? (
              <>
                <UserIcon fontSize="small" />
                <EntityRefLinks
                  entityRefs={ownerRefs}
                  defaultKind="Group"
                  hideIcons
                />
              </>
            ) : (
              <Typography variant="caption">owner 미지정</Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
