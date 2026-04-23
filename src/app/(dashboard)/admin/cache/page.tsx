import { Metadata } from 'next';
import { CacheManagementDashboard } from '@/components/cache-management';

export const metadata: Metadata = {
  title: 'Gerenciamento de Cache | ConstrutorPro',
  description: 'Monitore e gerencie o cache Redis do sistema',
};

export default function CacheManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <CacheManagementDashboard />
    </div>
  );
}
