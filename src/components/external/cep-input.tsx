// =============================================================================
// ConstrutorPro - Componente de Input CEP com Consulta Automática
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConsultaCEP, formatarCEPInput } from '@/hooks/use-external-apis';
import { Search, Loader2, XCircle, MapPin } from 'lucide-react';

interface CEPInputProps {
  value: string;
  onChange: (value: string) => void;
  onConsultaSucesso?: (dados: {
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
    ibge: string;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoConsultar?: boolean;
}

export function CEPInput({
  value,
  onChange,
  onConsultaSucesso,
  placeholder = '00000-000',
  disabled = false,
  className,
  autoConsultar = true,
}: CEPInputProps) {
  const { consultar, loading, error, data, clear } = useConsultaCEP();
  const [inputValue, setInputValue] = useState(value);

  // Sincronizar valor externo
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Formatar ao digitar
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCEPInput(e.target.value);
    setInputValue(formatted);
    onChange(formatted.replace(/\D/g, ''));
  };

  // Consultar automaticamente quando CEP estiver completo
  useEffect(() => {
    if (!autoConsultar) return;

    const cepLimpo = inputValue.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      consultar(cepLimpo);
    } else {
      clear();
    }
  }, [inputValue, autoConsultar, consultar, clear]);

  // Notificar sucesso
  useEffect(() => {
    if (data && onConsultaSucesso) {
      onConsultaSucesso({
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        ibge: data.ibge,
      });
    }
  }, [data, onConsultaSucesso]);

  // Consultar manualmente
  const handleConsultar = () => {
    const cepLimpo = inputValue.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      consultar(cepLimpo);
    }
  };

  const isValid = inputValue.replace(/\D/g, '').length === 8;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={inputValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            maxLength={9}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {!autoConsultar && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleConsultar}
            disabled={!isValid || loading || disabled}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Endereço encontrado */}
      {data && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            {data.logradouro && (
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {data.logradouro}
              </p>
            )}
            {data.bairro && (
              <p className="text-xs text-blue-600 dark:text-blue-500">
                {data.bairro}
              </p>
            )}
            <p className="text-xs text-blue-600 dark:text-blue-500">
              {data.localidade} - {data.uf}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
          <XCircle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
