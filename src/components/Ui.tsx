import React from 'react';

export function Card({children, className=''}:{children:React.ReactNode; className?:string}) {
  return <div className={`rounded-xl border bg-white p-4 ${className}`}>{children}</div>;
}
export function Stat({label, value}:{label:string; value:any}) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </Card>
  );
}
export function Badge({children}:{children:React.ReactNode}) {
  return <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{children}</span>;
}
export function Button(
  {children, variant='primary', ...props}:
  {children:React.ReactNode; variant?:'primary'|'secondary'|'ghost'} & React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900',
    ghost: 'bg-slate-100 text-slate-800 hover:bg-slate-200'
  } as const;
  return <button className={`px-3 py-2 rounded-lg ${styles[variant]} disabled:opacity-50`} {...props}>{children}</button>;
}
