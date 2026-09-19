import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="af-field-label">
      {children}
    </label>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <span className="af-field-hint">{children}</span>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="af-input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="af-textarea" {...props} />;
}
