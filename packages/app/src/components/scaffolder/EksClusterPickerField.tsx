import React, { useEffect, useState } from 'react';
import { discoveryApiRef, fetchApiRef, useApi } from '@backstage/core-plugin-api';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@material-ui/core';

type UiOptions = {
  region?: string;
  hubClusterName?: string;
};

type ClusterItem = {
  name: string;
  region: string;
};

type ClustersResponse = {
  clusters?: ClusterItem[];
};

export const EksClusterPickerField = (
  props: FieldExtensionComponentProps<string, UiOptions>,
) => {
  const {
    onChange,
    rawErrors,
    required,
    formData,
    label,
    uiSchema,
    idSchema,
    schema,
  } = props;

  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const region = uiSchema['ui:options']?.region ?? 'ap-northeast-2';
  const hubClusterName =
    uiSchema['ui:options']?.hubClusterName ?? 'sesac-ref-impl';

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const baseUrl = await discoveryApi.getBaseUrl('eks');
        const response = await fetchApi.fetch(
          `${baseUrl}/clusters?region=${encodeURIComponent(region)}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch EKS clusters: ${response.status}`);
        }
        const data = (await response.json()) as ClustersResponse;
        if (mounted) {
          setClusters(data.clusters ?? []);
        }
      } catch (e) {
        if (mounted) {
          setClusters([]);
          setError('EKS 클러스터 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [discoveryApi, fetchApi, region]);

  const hasErrors = Boolean(rawErrors?.length) || Boolean(error);
  const helperText =
    error ??
    (rawErrors?.length
      ? rawErrors.join(', ')
      : `${region} 리전의 EKS 클러스터 목록입니다.`);

  return (
    <FormControl
      fullWidth
      required={required}
      error={hasErrors}
      disabled={loading}
      margin="normal"
    >
      <InputLabel id={`${idSchema.$id}-label`}>
        {label ?? schema.title ?? 'EKS Cluster'}
      </InputLabel>
      <Select
        labelId={`${idSchema.$id}-label`}
        value={formData ?? ''}
        onChange={event => onChange(String(event.target.value))}
      >
        <MenuItem value="">
          <em>선택 안 함</em>
        </MenuItem>
        {clusters.map(cluster => (
          <MenuItem
            key={`${cluster.region}:${cluster.name}`}
            value={cluster.name}
          >
            {cluster.name === hubClusterName
              ? `${cluster.name} (허브 클러스터, ${cluster.region})`
              : `${cluster.name} (${cluster.region})`}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};
