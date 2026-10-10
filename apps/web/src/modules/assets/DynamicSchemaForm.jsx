import React from 'react';
import { Eye, Lock } from 'lucide-react';

export function DynamicSchemaForm({ schema, values, onChange, disabled = false }) {
  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="p-4 rounded-lg bg-slate-50 border border-trust-border text-xs text-trust-text-muted italic">
        No dynamic attribute schema defined for this asset type.
      </div>
    );
  }

  const handleChange = (field, value, type) => {
    let finalValue = value;
    if (type === 'number') {
      finalValue = value === '' ? '' : Number(value);
    } else if (type === 'boolean') {
      finalValue = Boolean(value);
    }
    onChange({
      ...values,
      [field]: finalValue,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(schema).map(([fieldKey, rule]) => {
          const isRestricted = rule.visibility === 'RESTRICTED';
          const isRequired = rule.required;
          const val = values[fieldKey] !== undefined ? values[fieldKey] : '';

          return (
            <div key={fieldKey} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-trust-text flex items-center gap-1 capitalize">
                  <span>{fieldKey.replace(/([A-Z])/g, ' $1')}</span>
                  {isRequired && <span className="text-trust-error font-semibold">*</span>}
                </label>

                {/* Visibility Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border font-medium ${
                    isRestricted
                      ? 'bg-trust-error/10 text-trust-error border-trust-error/20'
                      : 'bg-trust-accent/10 text-trust-accent border-trust-accent/20'
                  }`}
                  title={
                    isRestricted
                      ? 'Restricted: Stored in Private Data Collection (PDC); hidden from general investors'
                      : 'Public: Disclosed on token passport and public verify portal'
                  }
                >
                  {isRestricted ? <Lock className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                  <span>{rule.visibility || 'PUBLIC'}</span>
                </span>
              </div>

              {rule.type === 'number' ? (
                <input
                  type="number"
                  disabled={disabled}
                  required={isRequired}
                  value={val}
                  onChange={(e) => handleChange(fieldKey, e.target.value, 'number')}
                  placeholder={`Enter ${fieldKey}...`}
                  className="trust-input w-full font-mono disabled:opacity-50"
                />
              ) : (
                <input
                  type="text"
                  disabled={disabled}
                  required={isRequired}
                  value={val}
                  onChange={(e) => handleChange(fieldKey, e.target.value, 'string')}
                  placeholder={`Enter ${fieldKey}...`}
                  className="trust-input w-full disabled:opacity-50"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
