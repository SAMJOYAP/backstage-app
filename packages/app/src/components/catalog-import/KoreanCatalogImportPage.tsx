import React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { StepLabel } from '@material-ui/core';
import {
  Content,
  ContentHeader,
  Header,
  InfoCard,
  Page,
  SupportButton,
} from '@backstage/core-components';
import {
  ImportStepper,
  defaultGenerateStepper,
  ImportFlows,
} from '@backstage/plugin-catalog-import';

const koreanGenerateStepper = (
  flow: ImportFlows,
  defaults: ReturnType<typeof defaultGenerateStepper>,
) => {
  const generated = defaultGenerateStepper(flow, defaults);

  return {
    ...generated,
    analyze: (...args: Parameters<typeof generated.analyze>) => {
      const step = generated.analyze(...args);
      return {
        ...step,
        stepLabel: <StepLabel>URL 입력</StepLabel>,
      };
    },
    prepare: (...args: Parameters<typeof generated.prepare>) => {
      const step = generated.prepare(...args);
      return {
        ...step,
        stepLabel: <StepLabel>준비</StepLabel>,
      };
    },
    review: (...args: Parameters<typeof generated.review>) => {
      const step = generated.review(...args);
      return {
        ...step,
        stepLabel: <StepLabel>검토</StepLabel>,
      };
    },
    finish: (...args: Parameters<typeof generated.finish>) => {
      const step = generated.finish(...args);
      return {
        ...step,
        stepLabel: <StepLabel>완료</StepLabel>,
      };
    },
  };
};

export const KoreanCatalogImportPage = () => (
  <Page themeId="home">
    <Header title="기존 컴포넌트 등록" />
    <Content>
      <ContentHeader title="저장소를 소프트웨어 카탈로그에 등록하세요">
        <SupportButton>
          저장소 URL 또는 catalog-info 파일 URL을 입력해 카탈로그에 컴포넌트를
          등록할 수 있습니다.
        </SupportButton>
      </ContentHeader>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <ImportStepper generateStepper={koreanGenerateStepper} />
        </Grid>
        <Grid item xs={12} md={4}>
          <InfoCard title="등록 안내">
            <Typography variant="body2" paragraph>
              URL 분석 후 엔티티를 확인하고 카탈로그 등록을 진행합니다.
            </Typography>
            <Typography variant="body2" paragraph>
              저장소 URL 또는 `catalog-info.yaml` URL을 입력해 등록할 수 있습니다.
            </Typography>
          </InfoCard>
        </Grid>
      </Grid>
    </Content>
  </Page>
);
