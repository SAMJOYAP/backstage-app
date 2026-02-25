import React, { useEffect, useMemo, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { TextField } from '@material-ui/core';

type UiOptions = {
  sourceField?: string;
  helperText?: string;
  acmArnField?: string;
  region?: string;
  statuses?: string[];
};

type FormContextLike = {
  formData?: Record<string, unknown>;
};

type CertificateItem = {
  arn: string;
  domainName: string;
};

type CertificatesResponse = {
  certificates?: CertificateItem[];
};

export const DefaultFromProjectTextField = (
  props: FieldExtensionComponentProps<string, UiOptions>,
) => {
  const {
    onChange,
    rawErrors,
    required,
    formData,
    label,
    schema,
    uiSchema,
  } = props;

  const sourceField = uiSchema['ui:options']?.sourceField ?? 'name';
  const acmArnField = uiSchema['ui:options']?.acmArnField ?? '';
  const acmRegion = uiSchema['ui:options']?.region ?? 'ap-northeast-2';
  const acmStatuses = uiSchema['ui:options']?.statuses ?? ['ISSUED'];
  const helperTextFromOption =
    uiSchema['ui:options']?.helperText ??
    '비워두면 프로젝트 이름으로 자동 등록됩니다.';

  const context = (props as { formContext?: FormContextLike }).formContext;
  const sourceCandidate = context?.formData?.[sourceField];
  const sourceValue = useMemo(
    () => (typeof sourceCandidate === 'string' ? sourceCandidate.trim() : ''),
    [sourceCandidate],
  );
  const selectedAcmArn = useMemo(() => {
    if (!acmArnField) {
      return '';
    }
    const candidate = context?.formData?.[acmArnField];
    return typeof candidate === 'string' ? candidate : '';
  }, [acmArnField, context?.formData]);

  const [inputValue, setInputValue] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [acmDomainName, setAcmDomainName] = useState('');

  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const statusesParam = useMemo(() => acmStatuses.join(','), [acmStatuses]);

  useEffect(() => {
    let mounted = true;

    const loadDomain = async () => {
      if (!acmArnField || !selectedAcmArn) {
        if (mounted) {
          setAcmDomainName('');
        }
        return;
      }

      try {
        const baseUrl = await discoveryApi.getBaseUrl('acm-certificates');
        const params = new URLSearchParams();
        params.set('region', acmRegion);
        params.set('statuses', statusesParam);
        const response = await fetchApi.fetch(
          `${baseUrl}/certificates?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch ACM certificates: ${response.status}`);
        }
        const data = (await response.json()) as CertificatesResponse;
        const found = (data.certificates ?? []).find(
          certificate => certificate.arn === selectedAcmArn,
        );
        if (mounted) {
          setAcmDomainName(found?.domainName ?? '');
        }
      } catch (_e) {
        if (mounted) {
          setAcmDomainName('');
        }
      }
    };

    loadDomain();
    return () => {
      mounted = false;
    };
  }, [
    acmArnField,
    acmRegion,
    discoveryApi,
    fetchApi,
    selectedAcmArn,
    statusesParam,
  ]);

  useEffect(() => {
    if (initialized) {
      return;
    }
    if (formData && sourceValue && formData !== sourceValue) {
      setInputValue(formData);
    } else if (formData && !sourceValue) {
      setInputValue(formData);
    }
    setInitialized(true);
  }, [formData, initialized, sourceValue]);

  useEffect(() => {
    const effectiveValue = inputValue.trim() || sourceValue;
    if (effectiveValue !== formData) {
      onChange(effectiveValue);
    }
  }, [formData, inputValue, onChange, sourceValue]);

  const resolvedHelperText = acmDomainName
    ? `${helperTextFromOption} 선택한 ACM 도메인: ${acmDomainName} (예: 접두사 "api" -> api.${acmDomainName.replace(/^\*\./, '')})`
    : helperTextFromOption;

  return (
    <TextField
      fullWidth
      required={required}
      margin="normal"
      label={label ?? schema.title ?? '입력값'}
      value={inputValue}
      placeholder={sourceValue || '프로젝트 이름을 입력하면 자동 반영됩니다'}
      error={Boolean(rawErrors?.length)}
      helperText={rawErrors?.length ? rawErrors.join(', ') : resolvedHelperText}
      onChange={event => {
        setInputValue(event.target.value);
      }}
    />
  );
};
