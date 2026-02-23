import React, { useEffect, useMemo, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { TextField } from '@material-ui/core';

type UiOptions = {
  sourceField?: string;
  helperText?: string;
};

type FormContextLike = {
  formData?: Record<string, unknown>;
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
  const helperTextFromOption =
    uiSchema['ui:options']?.helperText ??
    '비워두면 프로젝트 이름으로 자동 등록됩니다.';

  const context = (props as { formContext?: FormContextLike }).formContext;
  const sourceCandidate = context?.formData?.[sourceField];
  const sourceValue = useMemo(
    () => (typeof sourceCandidate === 'string' ? sourceCandidate.trim() : ''),
    [sourceCandidate],
  );

  const [inputValue, setInputValue] = useState('');
  const [initialized, setInitialized] = useState(false);

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

  return (
    <TextField
      fullWidth
      required={required}
      margin="normal"
      label={label ?? schema.title ?? '입력값'}
      value={inputValue}
      placeholder={sourceValue || '프로젝트 이름을 입력하면 자동 반영됩니다'}
      error={Boolean(rawErrors?.length)}
      helperText={rawErrors?.length ? rawErrors.join(', ') : helperTextFromOption}
      onChange={event => {
        setInputValue(event.target.value);
      }}
    />
  );
};
