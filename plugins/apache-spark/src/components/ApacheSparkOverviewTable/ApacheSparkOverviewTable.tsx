import {
  Progress,
  StatusError,
  StatusOK,
  StatusPending,
  StatusRunning,
  Table,
  TableColumn,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { apacheSparkApiRef } from '../../api';
import React, { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { ApacheSpark, ApacheSparkList } from '../../api/model';
import Alert from '@material-ui/lab/Alert';
import { createStyles, Drawer, makeStyles, Theme } from '@material-ui/core';
import { DrawerContent } from '../DetailedDrawer/DetailedDrawer';
import { getAnnotationValues } from '../utils';
import { useEntity } from '@backstage/plugin-catalog-react';

type TableData = {
  id: string;
  name: string;
  namespace: string;
  applicationState?: string;
  startedAt?: string;
  finishedAt?: string;
  raw: ApacheSpark;
};

const columns: TableColumn<TableData>[] = [
  {
    title: '이름',
    field: 'name',
  },
  { title: '네임스페이스', field: 'namespace', type: 'string' },
  {
    title: '애플리케이션 상태',
    field: 'applicationState',
  },
  {
    title: '시작 시간',
    field: 'startedAt',
    type: 'datetime',
    defaultSort: 'desc',
  },
  { title: '종료 시간', field: 'finishedAt', type: 'datetime' },
];

const useDrawerStyles = makeStyles((theme: Theme) =>
  createStyles({
    paper: {
      width: '60%',
      padding: theme.spacing(2.5),
    },
  }),
);

export const ApacheSparkOverviewTable = () => {
  const apiClient = useApi(apacheSparkApiRef);
  const [columnData, setColumnData] = useState([] as TableData[]);
  const [isOpen, toggleDrawer] = useState(false);
  const [drawerData, setDrawerData] = useState({} as ApacheSpark);
  const classes = useDrawerStyles();
  const { entity } = useEntity();
  const { ns, clusterName, labelSelector } = getAnnotationValues(entity);

  const { value, loading, error } = useAsync(
    async (): Promise<ApacheSparkList> => {
      return await apiClient.getSparkApps(clusterName, ns, labelSelector);
    },
  );

  useEffect(() => {
    const data = value?.items?.map(val => {
      let state = {};
      switch (val.status?.applicationState.state) {
        case 'RUNNING':
          state = <StatusRunning>실행 중</StatusRunning>;
          break;
        case 'COMPLETED':
          state = <StatusOK>완료</StatusOK>;
          break;
        case 'FAILED':
          state = <StatusError>실패</StatusError>;
          break;
        default:
          state = (
            <StatusPending>
              '${val.status.applicationState.state}'
            </StatusPending>
          );
          break;
      }
      return {
        id: `${val.metadata.namespace}/${val.metadata.name}`,
        raw: val,
        name: val.metadata.name,
        namespace: val.metadata.namespace,
        applicationState: state,
        startedAt: val.metadata.creationTimestamp,
        finishedAt: val.status?.terminationTime,
      } as TableData;
    });
    if (data && data.length > 0) {
      setColumnData(data);
    }
  }, [value]);
  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{`${error}`}</Alert>;
  }

  return (
    <>
      <Table
        options={{
          padding: 'dense',
          paging: true,
          search: true,
          sorting: true,
          pageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
        }}
        onRowClick={(_event, rowData: TableData | undefined) => {
          setDrawerData(rowData?.raw!);
          toggleDrawer(true);
        }}
        columns={columns}
        data={columnData}
      />
      <Drawer
        classes={{
          paper: classes.paper,
        }}
        anchor="right"
        open={isOpen}
        onClose={() => toggleDrawer(false)}
      >
        <DrawerContent toggleDrawer={toggleDrawer} apacheSpark={drawerData} />
      </Drawer>
    </>
  );
};
