import React from 'react';
import { Search } from 'lucide-react';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-6 text-slate-400 italic text-xs flex flex-col items-center gap-2">
      <Search className="w-5 h-5 text-slate-300" />
      {message}
    </div>
  );
}
