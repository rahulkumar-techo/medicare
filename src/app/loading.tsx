import React from 'react';

export default function Loading() {
  return (
    <div className="w-full flex-1 min-h-[50vh] flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-tealbrand-200 border-t-brand-600 rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-400">Loading...</span>
      </div>
    </div>
  );
}

