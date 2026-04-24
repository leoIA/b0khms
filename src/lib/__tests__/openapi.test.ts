// =============================================================================
// ConstrutorPro - OpenAPI Documentation Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { openapiSpec, openapiSecuritySchemes, openapiParameters } from '@/lib/openapi';
import { openapiSchemas } from '@/lib/openapi/schemas';
import { openapiPaths } from '@/lib/openapi/paths';

describe('OpenAPI Specification', () => {
  describe('Basic Structure', () => {
    it('should have valid OpenAPI version', () => {
      expect(openapiSpec.openapi).toBe('3.1.0');
    });

    it('should have required info fields', () => {
      expect(openapiSpec.info.title).toBe('ConstrutorPro API');
      expect(openapiSpec.info.version).toBe('1.0.0');
      expect(openapiSpec.info.description).toBeDefined();
      expect(openapiSpec.info.contact).toBeDefined();
    });

    it('should have servers defined', () => {
      expect(openapiSpec.servers).toBeDefined();
      expect(openapiSpec.servers?.length).toBeGreaterThan(0);
    });

    it('should have tags defined', () => {
      expect(openapiSpec.tags).toBeDefined();
      expect(openapiSpec.tags?.length).toBeGreaterThan(0);
      
      const tagNames = openapiSpec.tags?.map(t => t.name) || [];
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Clients');
      expect(tagNames).toContain('Projects');
      expect(tagNames).toContain('Financial');
    });
  });

  describe('Security Schemes', () => {
    it('should have session auth defined', () => {
      expect(openapiSecuritySchemes.sessionAuth).toBeDefined();
      expect(openapiSecuritySchemes.sessionAuth.type).toBe('apiKey');
      expect(openapiSecuritySchemes.sessionAuth.in).toBe('cookie');
    });

    it('should have bearer auth defined', () => {
      expect(openapiSecuritySchemes.bearerAuth).toBeDefined();
      expect(openapiSecuritySchemes.bearerAuth.type).toBe('http');
      expect(openapiSecuritySchemes.bearerAuth.scheme).toBe('bearer');
    });
  });

  describe('Common Parameters', () => {
    it('should have pagination parameters', () => {
      expect(openapiParameters.PageParam.name).toBe('page');
      expect(openapiParameters.LimitParam.name).toBe('limit');
    });

    it('should have search parameter', () => {
      expect(openapiParameters.SearchParam.name).toBe('search');
    });

    it('should have sort parameters', () => {
      expect(openapiParameters.SortByParam.name).toBe('sortBy');
      expect(openapiParameters.SortOrderParam.name).toBe('sortOrder');
    });

    it('should have ID parameter', () => {
      expect(openapiParameters.IdParam.name).toBe('id');
      expect(openapiParameters.IdParam.required).toBe(true);
    });
  });
});

describe('OpenAPI Schemas', () => {
  describe('Common Schemas', () => {
    it('should have Pagination schema', () => {
      expect(openapiSchemas.Pagination).toBeDefined();
      expect(openapiSchemas.Pagination.type).toBe('object');
      expect(openapiSchemas.Pagination.properties.page).toBeDefined();
      expect(openapiSchemas.Pagination.properties.limit).toBeDefined();
      expect(openapiSchemas.Pagination.properties.total).toBeDefined();
    });

    it('should have ApiError schema', () => {
      expect(openapiSchemas.ApiError).toBeDefined();
      expect(openapiSchemas.ApiError.properties.success).toBeDefined();
      expect(openapiSchemas.ApiError.properties.error).toBeDefined();
    });
  });

  describe('Auth Schemas', () => {
    it('should have UserSession schema', () => {
      expect(openapiSchemas.UserSession).toBeDefined();
      expect(openapiSchemas.UserSession.properties.id).toBeDefined();
      expect(openapiSchemas.UserSession.properties.email).toBeDefined();
      expect(openapiSchemas.UserSession.properties.role).toBeDefined();
    });

    it('should have LoginRequest schema', () => {
      expect(openapiSchemas.LoginRequest).toBeDefined();
      expect(openapiSchemas.LoginRequest.required).toContain('email');
      expect(openapiSchemas.LoginRequest.required).toContain('password');
    });

    it('should have RegisterRequest schema', () => {
      expect(openapiSchemas.RegisterRequest).toBeDefined();
      expect(openapiSchemas.RegisterRequest.required).toContain('name');
      expect(openapiSchemas.RegisterRequest.required).toContain('email');
      expect(openapiSchemas.RegisterRequest.required).toContain('password');
    });
  });

  describe('Client Schemas', () => {
    it('should have Client schema with all fields', () => {
      expect(openapiSchemas.Client).toBeDefined();
      expect(openapiSchemas.Client.properties.name).toBeDefined();
      expect(openapiSchemas.Client.properties.email).toBeDefined();
      expect(openapiSchemas.Client.properties.status).toBeDefined();
      expect(openapiSchemas.Client.properties.status.enum).toEqual(['active', 'inactive', 'blocked']);
    });

    it('should have CreateClientRequest schema', () => {
      expect(openapiSchemas.CreateClientRequest).toBeDefined();
      expect(openapiSchemas.CreateClientRequest.required).toContain('name');
    });

    it('should have UpdateClientRequest schema', () => {
      expect(openapiSchemas.UpdateClientRequest).toBeDefined();
    });
  });

  describe('Project Schemas', () => {
    it('should have Project schema with all fields', () => {
      expect(openapiSchemas.Project).toBeDefined();
      expect(openapiSchemas.Project.properties.name).toBeDefined();
      expect(openapiSchemas.Project.properties.status).toBeDefined();
      expect(openapiSchemas.Project.properties.estimatedValue).toBeDefined();
      expect(openapiSchemas.Project.properties.physicalProgress).toBeDefined();
      expect(openapiSchemas.Project.properties.financialProgress).toBeDefined();
    });

    it('should have valid Project status enum', () => {
      expect(openapiSchemas.Project.properties.status.enum).toEqual([
        'planning', 'active', 'paused', 'completed', 'cancelled'
      ]);
    });

    it('should have CreateProjectRequest schema', () => {
      expect(openapiSchemas.CreateProjectRequest).toBeDefined();
      expect(openapiSchemas.CreateProjectRequest.required).toContain('name');
    });
  });

  describe('Financial Schemas', () => {
    it('should have Transaction schema', () => {
      expect(openapiSchemas.Transaction).toBeDefined();
      expect(openapiSchemas.Transaction.properties.type).toBeDefined();
      expect(openapiSchemas.Transaction.properties.type.enum).toEqual(['income', 'expense']);
      expect(openapiSchemas.Transaction.properties.category).toBeDefined();
      expect(openapiSchemas.Transaction.properties.value).toBeDefined();
    });

    it('should have valid Transaction category enum', () => {
      expect(openapiSchemas.Transaction.properties.category.enum).toEqual([
        'material', 'labor', 'equipment', 'service', 'tax', 'administrative', 'other'
      ]);
    });
  });

  describe('Daily Log Schemas', () => {
    it('should have DailyLog schema', () => {
      expect(openapiSchemas.DailyLog).toBeDefined();
      expect(openapiSchemas.DailyLog.properties.weather).toBeDefined();
      expect(openapiSchemas.DailyLog.properties.weather.enum).toEqual(['sunny', 'cloudy', 'rainy', 'stormy']);
    });
  });

  describe('Health Check Schema', () => {
    it('should have HealthCheck schema', () => {
      expect(openapiSchemas.HealthCheck).toBeDefined();
      expect(openapiSchemas.HealthCheck.properties.status).toBeDefined();
      expect(openapiSchemas.HealthCheck.properties.database).toBeDefined();
      expect(openapiSchemas.HealthCheck.properties.cache).toBeDefined();
    });
  });
});

describe('OpenAPI Paths', () => {
  describe('Health Endpoint', () => {
    it('should have GET /api/health', () => {
      expect(openapiPaths['/api/health']).toBeDefined();
      expect(openapiPaths['/api/health'].get).toBeDefined();
      expect(openapiPaths['/api/health'].get.operationId).toBe('getHealth');
    });
  });

  describe('Authentication Endpoints', () => {
    it('should have POST /api/auth/register', () => {
      expect(openapiPaths['/api/auth/register']).toBeDefined();
      expect(openapiPaths['/api/auth/register'].post).toBeDefined();
    });
  });

  describe('Client Endpoints', () => {
    it('should have GET and POST /api/clientes', () => {
      expect(openapiPaths['/api/clientes']).toBeDefined();
      expect(openapiPaths['/api/clientes'].get).toBeDefined();
      expect(openapiPaths['/api/clientes'].post).toBeDefined();
    });

    it('should have CRUD operations for /api/clientes/{id}', () => {
      const clientPath = openapiPaths['/api/clientes/{id}'];
      expect(clientPath).toBeDefined();
      expect(clientPath.get).toBeDefined();
      expect(clientPath.put).toBeDefined();
      expect(clientPath.delete).toBeDefined();
    });
  });

  describe('Project Endpoints', () => {
    it('should have GET and POST /api/projetos', () => {
      expect(openapiPaths['/api/projetos']).toBeDefined();
      expect(openapiPaths['/api/projetos'].get).toBeDefined();
      expect(openapiPaths['/api/projetos'].post).toBeDefined();
    });

    it('should have budget vs actual endpoint', () => {
      expect(openapiPaths['/api/projetos/{id}/budget-vs-actual']).toBeDefined();
      expect(openapiPaths['/api/projetos/{id}/budget-vs-actual'].get).toBeDefined();
    });
  });

  describe('Supplier Endpoints', () => {
    it('should have GET and POST /api/fornecedores', () => {
      expect(openapiPaths['/api/fornecedores']).toBeDefined();
      expect(openapiPaths['/api/fornecedores'].get).toBeDefined();
      expect(openapiPaths['/api/fornecedores'].post).toBeDefined();
    });
  });

  describe('Budget Endpoints', () => {
    it('should have GET and POST /api/orcamentos', () => {
      expect(openapiPaths['/api/orcamentos']).toBeDefined();
      expect(openapiPaths['/api/orcamentos'].get).toBeDefined();
      expect(openapiPaths['/api/orcamentos'].post).toBeDefined();
    });
  });

  describe('Material Endpoints', () => {
    it('should have GET and POST /api/materiais', () => {
      expect(openapiPaths['/api/materiais']).toBeDefined();
      expect(openapiPaths['/api/materiais'].get).toBeDefined();
      expect(openapiPaths['/api/materiais'].post).toBeDefined();
    });
  });

  describe('Financial Endpoints', () => {
    it('should have GET and POST /api/financeiro', () => {
      expect(openapiPaths['/api/financeiro']).toBeDefined();
      expect(openapiPaths['/api/financeiro'].get).toBeDefined();
      expect(openapiPaths['/api/financeiro'].post).toBeDefined();
    });

    it('should have dashboard endpoint', () => {
      expect(openapiPaths['/api/financeiro/dashboard']).toBeDefined();
      expect(openapiPaths['/api/financeiro/dashboard'].get).toBeDefined();
    });
  });

  describe('Dashboard Endpoint', () => {
    it('should have GET /api/dashboard', () => {
      expect(openapiPaths['/api/dashboard']).toBeDefined();
      expect(openapiPaths['/api/dashboard'].get).toBeDefined();
    });
  });

  describe('SINAPI Endpoint', () => {
    it('should have GET /api/sinapi', () => {
      expect(openapiPaths['/api/sinapi']).toBeDefined();
      expect(openapiPaths['/api/sinapi'].get).toBeDefined();
    });
  });

  describe('AI Endpoint', () => {
    it('should have POST /api/ia/chat', () => {
      expect(openapiPaths['/api/ia/chat']).toBeDefined();
      expect(openapiPaths['/api/ia/chat'].post).toBeDefined();
    });
  });

  describe('Security Requirements', () => {
    it('should have security requirements on protected endpoints', () => {
      const clientsGet = openapiPaths['/api/clientes'].get;
      expect(clientsGet.security).toBeDefined();
      expect(clientsGet.security).toEqual([{ sessionAuth: [] }]);
    });

    it('should have operationId on all operations', () => {
      Object.values(openapiPaths).forEach((pathItem) => {
        const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
        methods.forEach((method) => {
          if (pathItem[method]) {
            expect(pathItem[method].operationId).toBeDefined();
          }
        });
      });
    });

    it('should have tags on all operations', () => {
      Object.values(openapiPaths).forEach((pathItem) => {
        const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
        methods.forEach((method) => {
          if (pathItem[method]) {
            expect(pathItem[method].tags).toBeDefined();
            expect(pathItem[method].tags?.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });
});

describe('OpenAPI Spec Integration', () => {
  it('should be valid JSON serializable', () => {
    expect(() => JSON.stringify(openapiSpec)).not.toThrow();
  });

  it('should have all referenced schemas defined', () => {
    const specString = JSON.stringify(openapiSpec);
    const schemaRefs = specString.match(/"\$ref":"#\/components\/schemas\/([^"]+)"/g) || [];
    
    schemaRefs.forEach((ref) => {
      const schemaName = ref.match(/schemas\/([^"]+)/)?.[1];
      if (schemaName) {
        expect(openapiSchemas[schemaName as keyof typeof openapiSchemas]).toBeDefined();
      }
    });
  });

  it('should have all referenced parameters defined', () => {
    const specString = JSON.stringify(openapiSpec);
    const paramRefs = specString.match(/"\$ref":"#\/components\/parameters\/([^"]+)"/g) || [];
    
    paramRefs.forEach((ref) => {
      const paramName = ref.match(/parameters\/([^"]+)/)?.[1];
      if (paramName) {
        expect(openapiParameters[paramName as keyof typeof openapiParameters]).toBeDefined();
      }
    });
  });
});
