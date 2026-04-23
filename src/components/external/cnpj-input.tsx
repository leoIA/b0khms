// =============================================================================
// ConstrutorPro - Componente de Input CNPJ com Consulta Automática
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConsultaCNPJ, formatarCNPJInput } from '@/hooks/use-external-apis';
import { Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface CNPJInputProps {
  value: string;
  onChange: (value: string) => void;
  onConsultaSucesso?: (dados: {
    razaoSocial: string;
    nomeFantasia: string | null;
    endereco: {
      logradouro: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      municipio: string | null;
      uf: string | null;
      cep: string | null;
    };
    contato: {
      email: string | null;
      telefone: string | null;
    };
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoConsultar?: boolean;
}

export function CNPJInput({
  value,
  onChange,
  onConsultaSucesso,
  placeholder = '00.000.000/0000-00',
  disabled = false,
  className,
  autoConsultar = true,
}: CNPJInputProps) {
  const { consultar, loading, error, data, clear } = useConsultaCNPJ();
  const [inputValue, setInputValue] = useState(value);

  // Sincronizar valor externo
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Formatar ao digitar
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCNPJInput(e.target.value);
    setInputValue(formatted);
    onChange(formatted.replace(/\D/g, ''));
  };

  // Consultar automaticamente quando CNPJ estiver completo
  useEffect(() => {
    if (!autoConsultar) return;

    const cnpjLimpo = inputValue.replace(/\D/g, '');
    if (cnpjLimpo.length === 14) {
      consultar(cnpjLimpo);
    } else {
      clear();
    }
  }, [inputValue, autoConsultar, consultar, clear]);

  // Notificar sucesso
  useEffect(() => {
    if (data && onConsultaSucesso) {
      onConsultaSucesso({
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        endereco: data.endereco,
        contato: data.contato,
      });
    }
  }, [data, onConsultaSucesso]);

  // Consultar manualmente
  const handleConsultar = () => {
    const cnpjLimpo = inputValue.replace(/\D/g, '');
    if (cnpjLimpo.length === 14) {
      consultar(cnpjLimpo);
    }
  };

  const isValid = inputValue.replace(/\D/g, '').length === 14;

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
            maxLength={18}
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

      {/* Status */}
      {data && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {data.razaoSocial}
            </p>
            {data.nomeFantasia && (
              <p className="text-xs text-green-600 dark:text-green-500">
                {data.nomeFantasia}
              </p>
            )}
            {data.formatted.address && (
              <p className="text-xs text-green-600 dark:text-green-500">
                {data.formatted.address}
              </p>
            )}
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900">
                {data.situacao}
              </Badge>
              {data.porte && (
                <Badge variant="outline" className="text-xs">
                  {data.porte}
                </Badge>
              )}
            </div>
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
