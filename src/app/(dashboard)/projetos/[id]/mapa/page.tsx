import { Metadata } from 'next';
import { ProjectMap } from '@/components/project-map';

export const metadata: Metadata = {
  title: 'Georreferenciamento | ConstrutorPro',
  description: 'Visualização e gestão de localização do projeto',
};

export default async function ProjectMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Georreferenciamento</h1>
        <p className="text-muted-foreground">
          Gerencie a localização, áreas e pontos de interesse do projeto
        </p>
      </div>
      
      <ProjectMap projectId={id} />
    </div>
  );
}
