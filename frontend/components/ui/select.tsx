"use client";
import React, { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", children, ...props }, ref) => {
    return (
      <label className="block">
        {label && <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>}
        <select
          ref={ref}
          className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50 ${error ? "border-red-500" : ""} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-vital">{error}</p>}
      </label>
    );
  }
);

Select.displayName = "Select";
