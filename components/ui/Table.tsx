'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  striped?: boolean;
  hoverable?: boolean;
}

export function Table<T>({ columns, data, keyExtractor, onRowClick, emptyMessage = 'No hay datos', striped = true, hoverable = true }: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="w-full">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800">
          <tr>
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {data.map((row, rowIndex) => (
            <tr
              key={keyExtractor(row)}
              className={`
                ${striped && rowIndex % 2 === 1 ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}
                ${hoverable && onRowClick ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50' : ''}
                transition-colors
              `}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td key={col.key} className={`px-4 py-3 text-zinc-900 dark:text-zinc-100 ${col.className || ''}`}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}