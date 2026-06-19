const labels={available:'Livre',occupied:'Ocupada',reserved:'Reservada',attention:'Atenção',open:'Aberto',preparing:'Em preparo',ready:'Pronto',delivered:'Entregue',cancelled:'Cancelado'};
export default function StatusBadge({status}){return <span className={`status-badge status-${status}`}>{labels[status]||status}</span>}
