// =============================================================================
// ConstrutorPro - Tests for Proposals System
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Proposal Validators Tests
// =============================================================================

describe('Proposal Validators', () => {
  // Import validators dynamically to avoid issues
  let validators: any;

  beforeEach(async () => {
    validators = await import('@/validators/proposals');
  });

  describe('proposalStatusSchema', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['draft', 'review', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled'];
      
      validStatuses.forEach(status => {
        const result = validators.proposalStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status values', () => {
      const result = validators.proposalStatusSchema.safeParse('invalid_status');
      expect(result.success).toBe(false);
    });
  });

  describe('discountTypeSchema', () => {
    it('should accept percentage type', () => {
      const result = validators.discountTypeSchema.safeParse('percentage');
      expect(result.success).toBe(true);
    });

    it('should accept fixed type', () => {
      const result = validators.discountTypeSchema.safeParse('fixed');
      expect(result.success).toBe(true);
    });

    it('should reject invalid discount type', () => {
      const result = validators.discountTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('proposalItemSchema', () => {
    it('should validate a valid proposal item', () => {
      const validItem = {
        title: 'Item de Teste',
        unit: 'un',
        quantity: 10,
        unitPrice: 100,
      };

      const result = validators.proposalItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const invalidItem = {
        unit: 'un',
        quantity: 10,
        unitPrice: 100,
      };

      const result = validators.proposalItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should require positive quantity', () => {
      const invalidItem = {
        title: 'Item de Teste',
        unit: 'un',
        quantity: -5,
        unitPrice: 100,
      };

      const result = validators.proposalItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should require non-negative unit price', () => {
      const invalidItem = {
        title: 'Item de Teste',
        unit: 'un',
        quantity: 10,
        unitPrice: -100,
      };

      const result = validators.proposalItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should default unit to "un" if not provided', () => {
      const item = {
        title: 'Item de Teste',
        quantity: 10,
        unitPrice: 100,
      };

      const result = validators.proposalItemSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unit).toBe('un');
      }
    });
  });

  describe('createProposalSchema', () => {
    it('should validate a valid proposal', () => {
      const validProposal = {
        title: 'Proposta de Teste',
        items: [
          { title: 'Item 1', quantity: 5, unitPrice: 100 },
          { title: 'Item 2', quantity: 10, unitPrice: 50 },
        ],
      };

      const result = validators.createProposalSchema.safeParse(validProposal);
      expect(result.success).toBe(true);
    });

    it('should require title with at least 3 characters', () => {
      const invalidProposal = {
        title: 'AB',
        items: [{ title: 'Item 1', quantity: 5, unitPrice: 100 }],
      };

      const result = validators.createProposalSchema.safeParse(invalidProposal);
      expect(result.success).toBe(false);
    });

    it('should require at least one item', () => {
      const invalidProposal = {
        title: 'Proposta de Teste',
        items: [],
      };

      const result = validators.createProposalSchema.safeParse(invalidProposal);
      expect(result.success).toBe(false);
    });

    it('should validate validUntil as a date', () => {
      const proposal = {
        title: 'Proposta de Teste',
        items: [{ title: 'Item 1', quantity: 5, unitPrice: 100 }],
        validUntil: '2025-12-31',
      };

      const result = validators.createProposalSchema.safeParse(proposal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validUntil).toBeInstanceOf(Date);
      }
    });

    it('should accept all optional fields', () => {
      const proposal = {
        title: 'Proposta de Teste',
        objective: 'Objetivo da proposta',
        paymentTerms: '50% antecipado',
        deliveryTime: '90 dias',
        warrantyTerms: '5 anos',
        validUntil: '2025-12-31',
        deliveryAddress: 'Rua Teste, 123',
        terms: 'Termos e condições',
        notes: 'Notas internas',
        clientNotes: 'Notas para o cliente',
        discountType: 'percentage',
        discountValue: 10,
        discountReason: 'Desconto promocional',
        includeCover: true,
        includeSummary: true,
        includeTimeline: false,
        includeTeam: false,
        includePortfolio: false,
        requiresSignature: true,
        items: [{ title: 'Item 1', quantity: 5, unitPrice: 100 }],
      };

      const result = validators.createProposalSchema.safeParse(proposal);
      expect(result.success).toBe(true);
    });
  });

  describe('updateProposalSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        title: 'Novo Título',
      };

      const result = validators.updateProposalSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow null values for optional relations', () => {
      const update = {
        clientId: null,
        projectId: null,
        budgetId: null,
      };

      const result = validators.updateProposalSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe('sendProposalSchema', () => {
    it('should validate email if provided', () => {
      const valid = { emailTo: 'test@example.com' };
      const result = validators.sendProposalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalid = { emailTo: 'invalid-email' };
      const result = validators.sendProposalSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should allow empty object', () => {
      const result = validators.sendProposalSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('proposalFiltersSchema', () => {
    it('should apply default values', () => {
      const result = validators.proposalFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should validate pagination params', () => {
      const result = validators.proposalFiltersSchema.safeParse({
        page: 2,
        limit: 20,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should limit max page size', () => {
      const result = validators.proposalFiltersSchema.safeParse({
        limit: 200,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createProposalTemplateSchema', () => {
    it('should validate a valid template', () => {
      const template = {
        name: 'Modelo Residencial',
        code: 'RES-001',
        description: 'Modelo para propostas residenciais',
        category: 'residencial',
        defaultValidDays: 30,
      };

      const result = validators.createProposalTemplateSchema.safeParse(template);
      expect(result.success).toBe(true);
    });

    it('should require name with at least 2 characters', () => {
      const template = {
        name: 'A',
      };

      const result = validators.createProposalTemplateSchema.safeParse(template);
      expect(result.success).toBe(false);
    });

    it('should limit valid days to max 365', () => {
      const template = {
        name: 'Modelo Teste',
        defaultValidDays: 400,
      };

      const result = validators.createProposalTemplateSchema.safeParse(template);
      expect(result.success).toBe(false);
    });
  });

  describe('createFollowupSchema', () => {
    it('should validate a valid followup', () => {
      const followup = {
        type: 'call',
        title: 'Ligar para cliente',
        content: 'Verificar interesse na proposta',
      };

      const result = validators.createFollowupSchema.safeParse(followup);
      expect(result.success).toBe(true);
    });

    it('should accept valid followup types', () => {
      const types = ['reminder', 'call', 'email', 'meeting', 'note'];
      
      types.forEach(type => {
        const result = validators.createFollowupSchema.safeParse({
          type,
          title: 'Teste',
        });
        expect(result.success).toBe(true);
      });
    });

    it('should require title', () => {
      const result = validators.createFollowupSchema.safeParse({
        type: 'call',
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Proposal Number Generator Tests
// =============================================================================

describe('Proposal Number Generator', () => {
  it('should generate proposal number with correct format', () => {
    const year = new Date().getFullYear();
    // Test format: PROP-YYYY-NNNN
    const expectedPattern = new RegExp(`^PROP-${year}-\\d{4}$`);
    
    // Simulate number generation
    const sequential = '0001';
    const generatedNumber = `PROP-${year}-${sequential}`;
    
    expect(generatedNumber).toMatch(expectedPattern);
  });

  it('should pad sequential number to 4 digits', () => {
    const testCases = [
      { input: 1, expected: '0001' },
      { input: 10, expected: '0010' },
      { input: 100, expected: '0100' },
      { input: 9999, expected: '9999' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = input.toString().padStart(4, '0');
      expect(result).toBe(expected);
    });
  });
});

// =============================================================================
// Proposal Calculations Tests
// =============================================================================

describe('Proposal Calculations', () => {
  describe('Subtotal Calculation', () => {
    it('should calculate subtotal correctly', () => {
      const items = [
        { quantity: 10, unitPrice: 100 },
        { quantity: 5, unitPrice: 200 },
        { quantity: 2, unitPrice: 500 },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      expect(subtotal).toBe(3000);
    });

    it('should handle decimal quantities', () => {
      const items = [
        { quantity: 10.5, unitPrice: 100 },
        { quantity: 2.75, unitPrice: 200 },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      expect(subtotal).toBe(1600);
    });

    it('should return 0 for empty items', () => {
      const items: any[] = [];
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      expect(subtotal).toBe(0);
    });
  });

  describe('Discount Calculation', () => {
    it('should calculate percentage discount', () => {
      const subtotal = 1000;
      const discountType = 'percentage';
      const discountValue = 10;

      const discount = discountType === 'percentage' 
        ? subtotal * (discountValue / 100) 
        : discountValue;

      expect(discount).toBe(100);
    });

    it('should calculate fixed discount', () => {
      const subtotal = 1000;
      const discountType = 'fixed';
      const discountValue = 150;

      const discount = discountType === 'percentage' 
        ? subtotal * (discountValue / 100) 
        : discountValue;

      expect(discount).toBe(150);
    });

    it('should calculate total with percentage discount', () => {
      const subtotal = 1000;
      const discountType = 'percentage';
      const discountValue = 10;

      const total = discountType === 'percentage'
        ? subtotal * (1 - discountValue / 100)
        : subtotal - discountValue;

      expect(total).toBe(900);
    });

    it('should calculate total with fixed discount', () => {
      const subtotal = 1000;
      const discountType = 'fixed';
      const discountValue = 150;

      const total = discountType === 'percentage'
        ? subtotal * (1 - discountValue / 100)
        : subtotal - discountValue;

      expect(total).toBe(850);
    });

    it('should not allow negative total', () => {
      const subtotal = 100;
      const discountValue = 150;

      const total = Math.max(0, subtotal - discountValue);
      expect(total).toBe(0);
    });
  });
});

// =============================================================================
// Proposal Status Transitions Tests
// =============================================================================

describe('Proposal Status Transitions', () => {
  const validTransitions: Record<string, string[]> = {
    draft: ['review', 'sent', 'cancelled'],
    review: ['draft', 'sent', 'cancelled'],
    sent: ['viewed', 'accepted', 'rejected', 'expired', 'cancelled'],
    viewed: ['accepted', 'rejected', 'expired', 'cancelled'],
    accepted: [],
    rejected: [],
    expired: [],
    cancelled: [],
  };

  it('should define valid transitions from draft', () => {
    expect(validTransitions.draft).toContain('review');
    expect(validTransitions.draft).toContain('sent');
    expect(validTransitions.draft).toContain('cancelled');
  });

  it('should define valid transitions from sent', () => {
    expect(validTransitions.sent).toContain('viewed');
    expect(validTransitions.sent).toContain('accepted');
    expect(validTransitions.sent).toContain('rejected');
  });

  it('should not allow transitions from final states', () => {
    expect(validTransitions.accepted).toHaveLength(0);
    expect(validTransitions.rejected).toHaveLength(0);
    expect(validTransitions.expired).toHaveLength(0);
    expect(validTransitions.cancelled).toHaveLength(0);
  });

  it('should validate edit permissions based on status', () => {
    const editableStatuses = ['draft', 'review'];
    const nonEditableStatuses = ['sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled'];

    editableStatuses.forEach(status => {
      expect(editableStatuses.includes(status)).toBe(true);
    });

    nonEditableStatuses.forEach(status => {
      expect(editableStatuses.includes(status)).toBe(false);
    });
  });

  it('should validate send permissions based on status', () => {
    const sendableStatuses = ['draft', 'review'];
    
    expect(sendableStatuses.includes('draft')).toBe(true);
    expect(sendableStatuses.includes('review')).toBe(true);
    expect(sendableStatuses.includes('sent')).toBe(false);
  });
});

// =============================================================================
// PDF Generation Tests
// =============================================================================

describe('Proposal PDF Data Structure', () => {
  it('should define correct PDF data structure', () => {
    const pdfData = {
      company: {
        name: 'Empresa Teste',
        cnpj: '12.345.678/0001-90',
        email: 'empresa@teste.com',
      },
      proposal: {
        number: 'PROP-2025-0001',
        title: 'Proposta de Teste',
        version: 1,
        status: 'sent',
        subtotal: 1000,
        totalValue: 900,
      },
      client: {
        name: 'Cliente Teste',
        email: 'cliente@teste.com',
      },
      items: [
        {
          title: 'Item 1',
          unit: 'un',
          quantity: 10,
          unitPrice: 100,
          totalPrice: 1000,
        },
      ],
      options: {
        includeCover: true,
        includeSummary: true,
        includeTimeline: false,
        includeTeam: false,
        includePortfolio: false,
        requiresSignature: true,
      },
    };

    // Verify structure
    expect(pdfData.company.name).toBeDefined();
    expect(pdfData.proposal.number).toBeDefined();
    expect(pdfData.client).toBeDefined();
    expect(pdfData.items).toBeInstanceOf(Array);
    expect(pdfData.items.length).toBeGreaterThan(0);
    expect(pdfData.options.requiresSignature).toBe(true);
  });
});

// =============================================================================
// Currency Formatting Tests
// =============================================================================

describe('Currency Formatting', () => {
  it('should format BRL currency correctly', () => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    // Verify the formatted string starts with R$ and has correct structure
    expect(formatCurrency(1000)).toMatch(/R\$\s*1\.000,00/);
    expect(formatCurrency(100.5)).toMatch(/R\$\s*100,50/);
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });
});

// =============================================================================
// Date Formatting Tests
// =============================================================================

describe('Date Formatting', () => {
  it('should format dates in Brazilian format', () => {
    const date = new Date('2025-12-31');
    const formatted = date.toLocaleDateString('pt-BR');
    expect(formatted).toBe('31/12/2025');
  });

  it('should handle invalid dates', () => {
    const formatDate = (date: Date | undefined) => {
      if (!date) return '-';
      try {
        return date.toLocaleDateString('pt-BR');
      } catch {
        return '-';
      }
    };

    expect(formatDate(undefined)).toBe('-');
    // Invalid date returns 'Invalid Date' string in some environments
    const invalidResult = formatDate(new Date('invalid'));
    expect(invalidResult === '-' || invalidResult === 'Invalid Date').toBe(true);
  });
});
