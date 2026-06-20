import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nada por aqui', description, text = 'Os novos registros aparecerão nesta área.' }) {
  return <div className="empty-state"><Icon /><b>{title}</b><span>{description || text}</span></div>;
}
