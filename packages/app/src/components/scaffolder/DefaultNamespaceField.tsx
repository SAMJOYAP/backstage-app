import React, { useEffect, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { TextField } from '@material-ui/core';

type UiOptions = {
  sourceField?: string;
};

type FormContextLike = {
  formData?: Record<string, unknown>;
};

export const DefaultNamespaceField = (
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

  const [touched, setTouched] = useState(Boolean(formData));
  const sourceField = uiSchema['ui:options']?.sourceField ?? 'name';

  const context = (props as { formContext?: FormContextLike }).formContext;
  const sourceCandidate = context?.formData?.[sourceField];
  const sourceValue = typeof sourceCandidate === 'string' ? sourceCandidate : '';

  useEffect(() => {
    if (!touched && sourceValue && formData !== sourceValue) {
      onChange(sourceValue);
    }
  }, [formData, onChange, sourceValue, touched]);

  return (
    <TextField
      fullWidth
      required={required}
      margin="normal"
      label={label ?? schema.title ?? '대상 Namespace'}
      value={formData ?? ''}
      error={Boolean(rawErrors?.length)}
      helperText={
        rawErrors?.length
          ? rawErrors.join(', ')
          : '기본값은 프로젝트 이름이며, 필요하면 직접 수정할 수 있습니다.'
      }
      onChange={event => {
        setTouched(true);
        onChange(event.target.value);
      }}
    />
  );
};
