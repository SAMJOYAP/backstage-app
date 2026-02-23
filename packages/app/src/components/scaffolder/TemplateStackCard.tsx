import React from 'react';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import { useRouteRef } from '@backstage/core-plugin-api';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
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
import CodeIcon from '@material-ui/icons/Code';
import MemoryIcon from '@material-ui/icons/Memory';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import DeveloperBoardIcon from '@material-ui/icons/DeveloperBoard';
import StorageIcon from '@material-ui/icons/Storage';
import FolderIcon from '@material-ui/icons/Folder';
import FlashOnIcon from '@material-ui/icons/FlashOn';
import TimelineIcon from '@material-ui/icons/Timeline';
import DeviceHubIcon from '@material-ui/icons/DeviceHub';
import WidgetsIcon from '@material-ui/icons/Widgets';
import BlurOnIcon from '@material-ui/icons/BlurOn';

const useStyles = makeStyles({
  card: {
    height: '100%',
    borderTop: '4px solid var(--template-color)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 170,
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    backgroundColor: 'var(--template-color)',
  },
  title: {
    fontWeight: 700,
    lineHeight: 1.3,
  },
  description: {
    color: '#64748b',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: 58,
  },
});

const iconMap = {
  nodejs: CodeIcon,
  java: MemoryIcon,
  eks: AccountTreeIcon,
  ec2: DeveloperBoardIcon,
  rds: StorageIcon,
  dynamodb: StorageIcon,
  s3: FolderIcon,
  elasticache: FlashOnIcon,
  datapipeline: TimelineIcon,
  golang: CodeIcon,
  workflow: DeviceHubIcon,
  kubernetes: WidgetsIcon,
  ray: BlurOnIcon,
} as const;

export const TemplateStackCard = ({
  template,
}: {
  template: TemplateEntityV1beta3;
}) => {
  const classes = useStyles();
  const toTemplate = useRouteRef(scaffolderPlugin.routes.selectedTemplate);

  const iconKey =
    template.metadata.annotations?.['sesac.io/template-icon']?.toLowerCase() ??
    '';
  const color =
    template.metadata.annotations?.['sesac.io/template-color'] ?? '#64748b';
  const stackLabel =
    template.metadata.annotations?.['sesac.io/template-stack'] ?? 'Template';

  const Icon =
    iconMap[iconKey as keyof typeof iconMap] ??
    (template.spec.type === 'infrastructure' ? StorageIcon : AppsIcon);

  const namespace = template.metadata.namespace ?? 'default';
  const title = template.metadata.title ?? template.metadata.name;
  const description = template.metadata.description ?? '템플릿 설명이 없습니다.';

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
              <Icon fontSize="small" />
            </Box>
            <Typography variant="h6" className={classes.title}>
              {title}
            </Typography>
          </Box>
          <Typography variant="body2" className={classes.description}>
            {description}
          </Typography>
          <Box>
            <Chip
              size="small"
              label={stackLabel}
              style={{ backgroundColor: `${color}22`, color }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
