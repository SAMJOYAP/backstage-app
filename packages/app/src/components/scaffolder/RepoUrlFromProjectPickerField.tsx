import React, { useEffect, useMemo, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@material-ui/core';

type UiOptions = {
  allowedHosts?: string[];
  allowedOwners?: string[];
  sourceField?: string;
};

type FormContextLike = {
  formData?: Record<string, unknown>;
};

const parseRepoUrlValue = (value?: string) => {
  if (!value || !value.includes('?')) {
    return { host: '', owner: '', repo: '' };
  }

  const [host, query] = value.split('?');
  const params = new URLSearchParams(query);
  return {
    host: host ?? '',
    owner: params.get('owner') ?? '',
    repo: params.get('repo') ?? '',
  };
};

export const RepoUrlFromProjectPickerField = (
  props: FieldExtensionComponentProps<string, UiOptions>,
) => {
  const { onChange, rawErrors, formData, required, uiSchema } = props;

  const options = uiSchema['ui:options'] ?? {};
  const allowedHosts = options.allowedHosts ?? ['github.com'];
  const allowedOwners = options.allowedOwners ?? [];
  const sourceField = options.sourceField ?? 'name';

  const parsed = useMemo(() => parseRepoUrlValue(formData), [formData]);
  const [owner, setOwner] = useState(
    parsed.owner || allowedOwners[0] || '',
  );
  const [repoInput, setRepoInput] = useState(parsed.repo || '');

  const context = (props as { formContext?: FormContextLike }).formContext;
  const sourceCandidate = context?.formData?.[sourceField];
  const sourceName =
    typeof sourceCandidate === 'string' ? sourceCandidate.trim() : '';

  useEffect(() => {
    if (!owner && allowedOwners[0]) {
      setOwner(allowedOwners[0]);
    }
  }, [allowedOwners, owner]);

  useEffect(() => {
    const host = parsed.host || allowedHosts[0] || 'github.com';
    const effectiveOwner = owner || allowedOwners[0] || '';
    const effectiveRepo = repoInput.trim() || sourceName;

    if (!effectiveOwner || !effectiveRepo) {
      onChange('');
      return;
    }

    const repoUrl = `${host}?owner=${encodeURIComponent(
      effectiveOwner,
    )}&repo=${encodeURIComponent(effectiveRepo)}`;

    if (repoUrl !== formData) {
      onChange(repoUrl);
    }
  }, [allowedHosts, allowedOwners, formData, onChange, owner, parsed.host, repoInput, sourceName]);

  const hasError = Boolean(rawErrors?.length);

  return (
    <>
      <FormControl fullWidth margin="normal" required={required} error={hasError}>
        <InputLabel id="repo-owner-label">GitHub Organization</InputLabel>
        <Select
          labelId="repo-owner-label"
          value={owner}
          onChange={event => setOwner(String(event.target.value))}
          disabled={allowedOwners.length <= 1}
        >
          {allowedOwners.map(item => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
          {allowedOwners.length === 0 ? (
            <MenuItem value="">
              <em>Organization 선택</em>
            </MenuItem>
          ) : null}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        margin="normal"
        label="레포지토리 이름 (선택)"
        value={repoInput}
        onChange={event => setRepoInput(event.target.value)}
        placeholder={sourceName || '프로젝트 이름을 입력하면 자동 반영됩니다'}
        error={hasError}
        helperText={
          rawErrors?.length
            ? rawErrors.join(', ')
            : '레포지토리 이름을 비우면 프로젝트 이름으로 자동 등록됩니다.'
        }
      />
      <FormHelperText>
        현재 대상: {(owner || 'Organization')}/{repoInput.trim() || sourceName || 'repo-name'}
      </FormHelperText>
    </>
  );
};
