import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { ROLE_PERMISSIONS } from '../utils/permissions';

export function RoleGuard({ 
  currentRole, 
  allowedRoles = [], 
  onNavigateHome,
  children 
}) {
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(currentRole);

  if (isAuthorized) {
    return <>{children}</>;
  }

  const roleLabel = ROLE_PERMISSIONS[currentRole]?.label || currentRole || 'Unknown Role';
  const allowedLabels = allowedRoles.map((r) => ROLE_PERMISSIONS[r]?.label || r).join(', ');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-[#D8E0E8] rounded-xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-semibold text-[#17202A] mb-2">
          Segregation of Duties Enforced
        </h3>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Your current active identity (<span className="font-semibold text-[#0F2A43]">{roleLabel}</span>) does not have authorization to view or operate in this module. Under consortium governance rules, operations in this domain are restricted to:
        </p>

        <div className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-3 text-xs font-mono text-[#0F2A43] mb-6">
          {allowedLabels || 'Restricted Module'}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Authorized Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
