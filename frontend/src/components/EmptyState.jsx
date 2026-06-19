import { Inbox } from 'lucide-react';
export default function EmptyState({title='Nada por aqui',text='Os novos registros aparecerão nesta área.'}){return <div className="empty-state"><Inbox/><b>{title}</b><span>{text}</span></div>}
