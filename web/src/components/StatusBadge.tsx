import { STATUS_COLOR, STATUS_LABEL } from '../lib/api';

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_COLOR[status] || 'bg-gray-200'}`}>{STATUS_LABEL[status] || status}</span>;
}
