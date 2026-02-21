import React from 'react';
import {
  Header,
  HeaderLabel,
  Page,
  Content,
  ContentHeader,
  SupportButton,
  InfoCard,
} from '@backstage/core-components';
import { Grid } from '@material-ui/core';
import { OverviewTable } from '../WorkflowOverview/WorkflowOverview';
import { useEntity } from '@backstage/plugin-catalog-react';
import { isArgoWorkflowsAvailable } from '../../plugin';
import { WorkflowTemplateTable } from '../WorkflowTemplateOverview/WorkflowTemplateOverview';

export const ArgoWorkflowsOverviewPage = () => (
  <Page themeId="tool">
    <Header title="Argo 워크플로우">
      <HeaderLabel label="라이프사이클" value="알파" />
    </Header>
    <Content>
      <ContentHeader title="개요">
        <SupportButton>Argo 워크플로우 현황을 확인합니다.</SupportButton>
      </ContentHeader>
      <Grid item>
        <OverviewTable />
      </Grid>
      <Grid item>
        <WorkflowTemplateTable />
      </Grid>
    </Content>
  </Page>
);

export const ArgoWorkflowsOverviewCard = (props: { title?: string }) => {
  const { entity } = useEntity();
  if (isArgoWorkflowsAvailable(entity)) {
    return (
      <InfoCard {...{ title: props.title ?? 'Argo 워크플로우' }}>
        <OverviewTable />
      </InfoCard>
    );
  }
  return null;
};

export const ArgoWorkflowsTemplatesOverviewCard = () => {
  const { entity } = useEntity();
  if (isArgoWorkflowsAvailable(entity)) {
    return (
      <InfoCard {...{ title: 'Argo 워크플로우 템플릿' }}>
        <WorkflowTemplateTable />
      </InfoCard>
    );
  }
  return null;
};
