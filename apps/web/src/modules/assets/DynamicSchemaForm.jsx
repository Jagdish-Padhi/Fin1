import React from 'react';
import { Eye, Lock } from 'lucide-react';

export function DynamicSchemaForm({ schema, values, onChange, disabled = false }) {
  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#5A6A7E] italic">
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
                <label className="font-semibold text-[#17202A] flex items-center gap-1 capitalize">
                  <span>{fieldKey.replace(/([A-Z])/g, ' $1')}</span>
                  {isRequired && <span className="text-[#B42318] font-bold">*</span>}
                </label>

                {/* Visibility Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium ${
                    isRestricted
                      ? 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/20'
                      : 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20'
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
                  className="w-full bg-white border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] font-mono disabled:opacity-50"
                />
              ) : (
                <input
                  type="text"
                  disabled={disabled}
                  required={isRequired}
                  value={val}
                  onChange={(e) => handleChange(fieldKey, e.target.value, 'string')}
                  placeholder={`Enter ${fieldKey}...`}
                  className="w-full bg-white border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] disabled:opacity-50"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
