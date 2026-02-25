import React, { useEffect, useMemo, useState } from 'react';
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
  region?: string;
  statuses?: string[];
  domainSuffix?: string;
};

type CertificateItem = {
  arn: string;
  domainName: string;
};

type CertificateOption = {
  arn: string;
  domainName: string;
  displayDomain: string;
};

type CertificatesResponse = {
  certificates?: CertificateItem[];
};

export const AcmCertificatePickerField = (
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
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const region = uiSchema['ui:options']?.region ?? 'ap-northeast-2';
  const statuses = uiSchema['ui:options']?.statuses ?? ['ISSUED'];

  const optionDomainSuffix = uiSchema['ui:options']?.domainSuffix ?? '';
  const domainSuffix = optionDomainSuffix;

  const statusesParam = useMemo(() => statuses.join(','), [statuses]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const baseUrl = await discoveryApi.getBaseUrl('acm-certificates');
        const params = new URLSearchParams();
        params.set('region', region);
        params.set('statuses', statusesParam);
        if (domainSuffix) {
          params.set('domainSuffix', domainSuffix);
        }

        const response = await fetchApi.fetch(
          `${baseUrl}/certificates?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ACM certificates: ${response.status}`,
          );
        }
        const data = (await response.json()) as CertificatesResponse;
        if (mounted) {
          setCertificates(data.certificates ?? []);
        }
      } catch (_e) {
        if (mounted) {
          setCertificates([]);
          setError('ACM 인증서 목록을 불러오지 못했습니다.');
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
  }, [discoveryApi, domainSuffix, fetchApi, region, statusesParam]);

  const wildcardCertificates = useMemo(() => {
    const options: CertificateOption[] = [];
    const seen = new Set<string>();

    for (const certificate of certificates) {
      const domain = certificate.domainName.trim();
      if (!domain) {
        continue;
      }

      if (domain.startsWith('*.')) {
        if (!seen.has(certificate.arn)) {
          options.push({
            arn: certificate.arn,
            domainName: certificate.domainName,
            displayDomain: domain,
          });
          seen.add(certificate.arn);
        }
        continue;
      }

      if (domainSuffix && domain.toLowerCase() === domainSuffix.toLowerCase()) {
        if (!seen.has(certificate.arn)) {
          options.push({
            arn: certificate.arn,
            domainName: certificate.domainName,
            displayDomain: `*.${domainSuffix}`,
          });
          seen.add(certificate.arn);
        }
      }
    }

    return options;
  }, [certificates, domainSuffix]);

  useEffect(() => {
    if (!formData && wildcardCertificates.length > 0) {
      onChange(wildcardCertificates[0].arn);
    }
  }, [formData, onChange, wildcardCertificates]);

  useEffect(() => {
    if (
      formData &&
      !wildcardCertificates.some(certificate => certificate.arn === formData)
    ) {
      onChange('');
    }
  }, [formData, onChange, wildcardCertificates]);

  const hasErrors = Boolean(rawErrors?.length) || Boolean(error);
  const helperText =
    error ??
    (rawErrors?.length
      ? rawErrors.join(', ')
      : domainSuffix
      ? `${region} 리전, ${domainSuffix} 도메인에 맞는 ACM 인증서 목록입니다.`
      : `${region} 리전 ACM 인증서 목록입니다.`);

  return (
    <FormControl
      fullWidth
      required={required}
      error={hasErrors}
      disabled={loading}
      margin="normal"
    >
      <InputLabel id={`${idSchema.$id}-label`}>
        {label ?? schema.title ?? 'ACM Certificate'}
      </InputLabel>
      <Select
        labelId={`${idSchema.$id}-label`}
        value={formData ?? ''}
        onChange={event => onChange(String(event.target.value))}
      >
        <MenuItem value="">
          <em>선택 안 함</em>
        </MenuItem>
        {wildcardCertificates.map(certificate => (
          <MenuItem key={certificate.arn} value={certificate.arn}>
            {certificate.displayDomain}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};
