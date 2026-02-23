import React, { useEffect, useState } from 'react';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@material-ui/core';

type UiOptions = {
  argoInstance?: string;
};

type ProjectsResponse = {
  argoInstance?: string;
  projects?: string[];
};

export const ArgoProjectPickerField = (
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
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const argoInstance = uiSchema['ui:options']?.argoInstance ?? 'in-cluster';

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const baseUrl = await discoveryApi.getBaseUrl('argocd-projects');
        const response = await fetchApi.fetch(
          `${baseUrl}/projects?argoInstance=${encodeURIComponent(argoInstance)}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch Argo projects: ${response.status}`);
        }
        const data = (await response.json()) as ProjectsResponse;
        if (mounted) {
          setProjects(data.projects ?? []);
        }
      } catch (_e) {
        if (mounted) {
          setProjects([]);
          setError('Argo CD Project 목록을 불러오지 못했습니다.');
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
  }, [argoInstance, discoveryApi, fetchApi]);

  const helperText =
    error ??
    (rawErrors?.length
      ? rawErrors.join(', ')
      : `Argo Instance: ${argoInstance}의 Project 목록`);

  return (
    <FormControl
      fullWidth
      required={required}
      error={Boolean(rawErrors?.length) || Boolean(error)}
      disabled={loading}
      margin="normal"
    >
      <InputLabel id={`${idSchema.$id}-label`}>
        {label ?? schema.title ?? 'Argo CD Project'}
      </InputLabel>
      <Select
        labelId={`${idSchema.$id}-label`}
        value={formData ?? ''}
        onChange={event => onChange(String(event.target.value))}
      >
        <MenuItem value="">
          <em>선택 안 함</em>
        </MenuItem>
        {projects.map(project => (
          <MenuItem key={project} value={project}>
            {project}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};
