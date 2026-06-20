export default function PageHeader({ eyebrow, title, description, children }) {
  return <div className="page-heading">
    <div><small>{eyebrow || 'CHEFCONTROL OPERAÇÃO'}</small><h1>{title}</h1><p>{description}</p></div>
    {children && <div className="page-actions">{children}</div>}
  </div>;
}
