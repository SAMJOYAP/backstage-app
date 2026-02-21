import { Content, Header, HeaderLabel, Page } from '@backstage/core-components';
import { ApacheSparkOverviewTable } from '../ApacheSparkOverviewTable/ApacheSparkOverviewTable';
import React from 'react';

export const ApacheSparkOverviewPage = () => (
  <Page themeId="tool">
    <Header title="Apache 스파크">
      <HeaderLabel label="라이프사이클" value="알파" />
    </Header>
    <Content>
      <ApacheSparkOverviewTable />
    </Content>
  </Page>
);
