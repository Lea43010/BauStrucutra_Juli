import { ReactNode } from "react";

interface PageHeaderProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export function PageHeader({ children, title, subtitle, onBack }: PageHeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="px-4 py-3">
        {title && (
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </header>
  );
}
