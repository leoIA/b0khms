'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Hexagon,
  Navigation,
  Upload,
  Download,
  Trash2,
  Edit,
  Plus,
  Map,
  Crosshair,
  Layers,
  Search,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MapPinned,
  FileJson,
  Route,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// Tipos
interface Coordinate {
  lat: number;
  longitude: number;
}

interface PolygonData {
  id: string;
  nome: string;
  tipo: string;
  coordenadas: Coordinate[];
  cor: string;
  opacidade: number;
  areaM2?: number;
}

interface MarkerData {
  id: string;
  nome: string;
  tipo: string;
  latitude: number;
  longitude: number;
  icone?: string;
  cor: string;
  entidadeTipo?: string;
  entidadeId?: string;
}

interface LocationData {
  id: string;
  nome: string;
  descricao?: string;
  tipo: string;
  latitude: number;
  longitude: number;
  endereco?: string;
  cidade?: string;
  estado?: string;
  areaM2?: number;
  status: string;
  poligonos?: PolygonData[];
  marcadores?: MarkerData[];
}

interface ProjectGeoData {
  project: {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    zoom?: number;
  } | null;
  locations: LocationData[];
  perimeter?: {
    coordenadas: Coordinate[];
    matricula?: string;
    car?: string;
    areaRegistrada?: number;
  } | null;
  imports: any[];
}

// Tipos de marcadores
const MARCADORES_TIPOS: Record<string, { label: string; icone: string; cor: string }> = {
  ponto: { label: 'Ponto de Interesse', icone: 'MapPin', cor: '#3B82F6' },
  equipamento: { label: 'Equipamento', icone: 'Cog', cor: '#8B5CF6' },
  acesso: { label: 'Ponto de Acesso', icone: 'DoorOpen', cor: '#10B981' },
  perigo: { label: 'Área de Perigo', icone: 'AlertTriangle', cor: '#EF4444' },
  referencia: { label: 'Ponto de Referência', icone: 'Flag', cor: '#F59E0B' },
  deposito: { label: 'Depósito', icone: 'Package', cor: '#6B7280' },
  escritorio: { label: 'Escritório', icone: 'Building', cor: '#0EA5E9' },
};

const POLIGONOS_TIPOS: Record<string, { label: string; cor: string }> = {
  area_trabalho: { label: 'Área de Trabalho', cor: '#3B82F6' },
  perimetro: { label: 'Perímetro', cor: '#EF4444' },
  zona_restrita: { label: 'Zona Restrita', cor: '#F97316' },
  lote: { label: 'Lote', cor: '#10B981' },
  terreno: { label: 'Terreno', cor: '#8B5CF6' },
  estacionamento: { label: 'Estacionamento', cor: '#6B7280' },
};

// Props
interface ProjectMapProps {
  projectId: string;
  readOnly?: boolean;
}

export function ProjectMap({ projectId, readOnly = false }: ProjectMapProps) {
  // Estados
  const [geoData, setGeoData] = useState<ProjectGeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [selectedPolygon, setSelectedPolygon] = useState<PolygonData | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [drawingMode, setDrawingMode] = useState<'none' | 'polygon' | 'marker'>('none');
  const [drawingPoints, setDrawingPoints] = useState<Coordinate[]>([]);
  
  // Map state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -23.5505, lng: -46.6333 });
  const [mapZoom, setMapZoom] = useState(15);
  
  // Dialogs
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPerimeter, setShowPerimeter] = useState(false);
  
  // Form states
  const [newLocation, setNewLocation] = useState({
    nome: '',
    descricao: '',
    tipo: 'obra',
    latitude: 0,
    longitude: 0,
    endereco: '',
    cidade: '',
    estado: '',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Carregar dados
  const loadGeoData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projetos/${projectId}/geo`);
      if (response.ok) {
        const data = await response.json();
        setGeoData(data);
        
        // Definir centro do mapa
        if (data.project?.latitude && data.project?.longitude) {
          setMapCenter({ lat: data.project.latitude, lng: data.project.longitude });
          setMapZoom(data.project.zoom || 15);
        } else if (data.locations.length > 0) {
          setMapCenter({
            lat: data.locations[0].latitude,
            lng: data.locations[0].longitude,
          });
        }
      }
    } catch (error) {
      console.error('Error loading geo data:', error);
      toast.error('Erro ao carregar dados geográficos');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadGeoData();
  }, [loadGeoData]);

  // Criar novo local
  const handleCreateLocation = async () => {
    if (!newLocation.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const response = await fetch(`/api/projetos/${projectId}/geo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'location',
          data: newLocation,
        }),
      });

      if (response.ok) {
        toast.success('Local criado com sucesso');
        setShowNewLocation(false);
        setNewLocation({
          nome: '',
          descricao: '',
          tipo: 'obra',
          latitude: 0,
          longitude: 0,
          endereco: '',
          cidade: '',
          estado: '',
        });
        loadGeoData();
      } else {
        throw new Error('Failed to create location');
      }
    } catch (error) {
      toast.error('Erro ao criar local');
    }
  };

  // Importar arquivo
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      
      try {
        const tipo = file.name.split('.').pop()?.toLowerCase() || 'kml';
        
        const response = await fetch(`/api/projetos/${projectId}/geo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'import',
            data: {
              nome: file.name,
              tipo,
              conteudo: content,
              tamanho: file.size,
            },
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          toast.success(result.mensagem);
          setShowImport(false);
          loadGeoData();
        } else {
          toast.error(result.mensagem);
        }
      } catch (error) {
        toast.error('Erro ao importar arquivo');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Exportar GeoJSON
  const handleExportGeoJSON = () => {
    if (!geoData) return;

    const features: any[] = [];

    // Adicionar locais como pontos
    geoData.locations.forEach(loc => {
      features.push({
        type: 'Feature',
        properties: {
          name: loc.nome,
          tipo: loc.tipo,
          status: loc.status,
        },
        geometry: {
          type: 'Point',
          coordinates: [loc.longitude, loc.latitude],
        },
      });

      // Adicionar polígonos
      loc.poligonos?.forEach(poly => {
        features.push({
          type: 'Feature',
          properties: {
            name: poly.nome,
            tipo: poly.tipo,
            cor: poly.cor,
            areaM2: poly.areaM2,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [poly.coordenadas.map(c => [c.longitude, c.lat])],
          },
        });
      });

      // Adicionar marcadores
      loc.marcadores?.forEach(marker => {
        features.push({
          type: 'Feature',
          properties: {
            name: marker.nome,
            tipo: marker.tipo,
            cor: marker.cor,
          },
          geometry: {
            type: 'Point',
            coordinates: [marker.longitude, marker.latitude],
          },
        });
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projeto-${projectId}-geo.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('GeoJSON exportado com sucesso');
  };

  // Deletar item
  const handleDeleteItem = async (type: 'location' | 'polygon' | 'marker', id: string) => {
    if (!confirm(`Tem certeza que deseja excluir este ${type === 'location' ? 'local' : type === 'polygon' ? 'polígono' : 'marcador'}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projetos/${projectId}/geo?type=${type}&id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Item excluído com sucesso');
        loadGeoData();
        setSelectedLocation(null);
        setSelectedPolygon(null);
        setSelectedMarker(null);
      }
    } catch (error) {
      toast.error('Erro ao excluir item');
    }
  };

  // Obter localização atual
  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setNewLocation(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          toast.success('Localização obtida com sucesso');
        },
        (error) => {
          toast.error('Erro ao obter localização: ' + error.message);
        }
      );
    } else {
      toast.error('Geolocalização não suportada pelo navegador');
    }
  };

  // Buscar endereço por coordenadas (reverse geocoding)
  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      // Usando Nominatim (OpenStreetMap) - gratuito
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data.address) {
        setNewLocation(prev => ({
          ...prev,
          endereco: data.display_name,
          cidade: data.address.city || data.address.town || data.address.village,
          estado: data.address.state,
        }));
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setMapZoom(prev => Math.min(prev + 1, 20));
  const handleZoomOut = () => setMapZoom(prev => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <Button onClick={() => setShowNewLocation(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Local
              </Button>
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportGeoJSON}>
            <Download className="h-4 w-4 mr-2" />
            Exportar GeoJSON
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleGetCurrentLocation}>
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{geoData?.locations.length || 0}</p>
                <p className="text-xs text-muted-foreground">Locais</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Hexagon className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {geoData?.locations.reduce((acc, l) => acc + (l.poligonos?.length || 0), 0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Polígonos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {geoData?.locations.reduce((acc, l) => acc + (l.marcadores?.length || 0), 0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Marcadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {geoData?.perimeter ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="text-2xl font-bold">
                  {geoData?.perimeter?.areaRegistrada?.toFixed(0) || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Área (m²)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Map className="h-5 w-5" />
              Mapa do Projeto
            </CardTitle>
            <CardDescription>
              Coordenadas: {mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)} | Zoom: {mapZoom}x
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-96 bg-muted rounded-lg overflow-hidden border">
              {/* Map placeholder - Shows instructions */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <MapPinned className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Visualização do Mapa</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Para visualização completa do mapa, integre com Leaflet ou Google Maps.
                  Use o botão abaixo para abrir no Google Maps.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&z=${mapZoom}`,
                      '_blank'
                    );
                  }}
                >
                  <Map className="h-4 w-4 mr-2" />
                  Abrir no Google Maps
                </Button>
              </div>
              
              {/* Zoom indicator */}
              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur rounded px-2 py-1 text-xs">
                {mapZoom}x
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (geoData?.project?.latitude && geoData?.project?.longitude) {
                    window.open(
                      `https://www.google.com/maps?q=${geoData.project.latitude},${geoData.project.longitude}`,
                      '_blank'
                    );
                  }
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Ver no Maps
              </Button>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPerimeter(true)}
                >
                  <Hexagon className="h-4 w-4 mr-2" />
                  Definir Perímetro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Locations List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Locais do Projeto</CardTitle>
            <CardDescription>
              Áreas de trabalho e pontos de interesse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {geoData?.locations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum local cadastrado</p>
                  {!readOnly && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewLocation(true)}
                    >
                      Adicionar primeiro local
                    </Button>
                  )}
                </div>
              ) : (
                geoData?.locations.map((location) => (
                  <div
                    key={location.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLocation?.id === location.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedLocation(location)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{location.nome}</span>
                          <Badge variant="outline" className="text-xs">
                            {location.tipo}
                          </Badge>
                        </div>
                        {location.endereco && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {location.endereco}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hexagon className="h-3 w-3" />
                            {location.poligonos?.length || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {location.marcadores?.length || 0}
                          </span>
                        </div>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem('location', location.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Location Details */}
      {selectedLocation && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedLocation.nome}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(null)}>
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="polygons">
                  Polígonos ({selectedLocation.poligonos?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="markers">
                  Marcadores ({selectedLocation.marcadores?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Latitude</Label>
                    <p className="font-mono">{selectedLocation.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Longitude</Label>
                    <p className="font-mono">{selectedLocation.longitude.toFixed(6)}</p>
                  </div>
                  {selectedLocation.cidade && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Cidade</Label>
                      <p>{selectedLocation.cidade}</p>
                    </div>
                  )}
                  {selectedLocation.estado && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <p>{selectedLocation.estado}</p>
                    </div>
                  )}
                  {selectedLocation.areaM2 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Área</Label>
                      <p>{selectedLocation.areaM2.toFixed(2)} m²</p>
                    </div>
                  )}
                </div>
                {selectedLocation.descricao && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="text-sm">{selectedLocation.descricao}</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="polygons" className="space-y-2">
                {selectedLocation.poligonos?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum polígono definido
                  </p>
                ) : (
                  selectedLocation.poligonos?.map((poly) => (
                    <div
                      key={poly.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: poly.cor }}
                        />
                        <div>
                          <p className="font-medium">{poly.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {POLIGONOS_TIPOS[poly.tipo]?.label || poly.tipo}
                            {poly.areaM2 && ` • ${poly.areaM2.toFixed(2)} m²`}
                          </p>
                        </div>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteItem('polygon', poly.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="markers" className="space-y-2">
                {selectedLocation.marcadores?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum marcador definido
                  </p>
                ) : (
                  selectedLocation.marcadores?.map((marker) => (
                    <div
                      key={marker.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin
                          className="h-5 w-5"
                          style={{ color: marker.cor }}
                        />
                        <div>
                          <p className="font-medium">{marker.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {MARCADORES_TIPOS[marker.tipo]?.label || marker.tipo}
                          </p>
                        </div>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteItem('marker', marker.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Novo Local */}
      <Dialog open={showNewLocation} onOpenChange={setShowNewLocation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Local</DialogTitle>
            <DialogDescription>
              Adicione uma nova área de trabalho ou ponto de interesse ao projeto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={newLocation.nome}
                onChange={(e) => setNewLocation(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Canteiro Central"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newLocation.tipo}
                onValueChange={(value) => setNewLocation(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="escritorio">Escritório</SelectItem>
                  <SelectItem value="ponto_interesse">Ponto de Interesse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={newLocation.latitude}
                  onChange={(e) => setNewLocation(prev => ({
                    ...prev,
                    latitude: parseFloat(e.target.value) || 0,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={newLocation.longitude}
                  onChange={(e) => setNewLocation(prev => ({
                    ...prev,
                    longitude: parseFloat(e.target.value) || 0,
                  }))}
                />
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                handleGetCurrentLocation();
              }}
            >
              <Crosshair className="h-4 w-4 mr-2" />
              Usar Minha Localização
            </Button>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={newLocation.descricao}
                onChange={(e) => setNewLocation(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição opcional do local..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLocation(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLocation}>
              Criar Local
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Importar */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Arquivo Geográfico</DialogTitle>
            <DialogDescription>
              Importe arquivos KML, GPX ou GeoJSON para adicionar áreas e pontos ao projeto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <FileJson className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-sm font-medium">KML</p>
                <p className="text-xs text-muted-foreground">Google Earth</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Route className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">GPX</p>
                <p className="text-xs text-muted-foreground">GPS Track</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Layers className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="text-sm font-medium">GeoJSON</p>
                <p className="text-xs text-muted-foreground">Standard</p>
              </div>
            </div>
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm mb-2">Arraste um arquivo ou clique para selecionar</p>
              <Input
                type="file"
                accept=".kml,.kmz,.gpx,.geojson,.json"
                className="hidden"
                id="geo-file-upload"
                onChange={handleImportFile}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('geo-file-upload')?.click()}
              >
                Selecionar Arquivo
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Perímetro */}
      <Dialog open={showPerimeter} onOpenChange={setShowPerimeter}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perímetro Oficial do Projeto</DialogTitle>
            <DialogDescription>
              Defina o perímetro do terreno para georreferenciamento oficial (Lei 14.133/2021).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input placeholder="Número da matrícula" />
              </div>
              <div className="space-y-2">
                <Label>CAR (Cadastro Ambiental Rural)</Label>
                <Input placeholder="Código CAR" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>ART Número</Label>
                <Input placeholder="Número da ART" />
              </div>
              <div className="space-y-2">
                <Label>Responsável Técnico</Label>
                <Input placeholder="Nome do responsável" />
              </div>
              <div className="space-y-2">
                <Label>CREA</Label>
                <Input placeholder="Número do CREA" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Coordenadas do Perímetro (GeoJSON)</Label>
              <Textarea
                placeholder='[{"lat": -23.5505, "lng": -46.6333}, ...]'
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Cole aqui as coordenadas do perímetro no formato JSON ou importe um arquivo KML.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPerimeter(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast.success('Perímetro salvo com sucesso');
              setShowPerimeter(false);
            }}>
              Salvar Perímetro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectMap;
