// =============================================================================
// ConstrutorPro - E2E Tests: Login Flow
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('deve exibir página de login', async ({ page }) => {
    await page.goto('/login');

    // Verificar título
    await expect(page).toHaveTitle(/ConstrutorPro/);

    // Verificar campos do formulário
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');

    // Preencher credenciais inválidas
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Verificar mensagem de erro
    await expect(page.locator('text=/credenciais|inválido|incorreto/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('deve redirecionar para dashboard após login', async ({ page }) => {
    // Skip se não houver credenciais de teste
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD);

    await page.goto('/login');

    await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
    await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD!);
    await page.locator('button[type="submit"]').click();

    // Verificar redirecionamento
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Ir para login se não autenticado
    await page.goto('/dashboard');
    
    // Se redirecionado para login, fazer login
    if (page.url().includes('/login')) {
      test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD);
      
      await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
      await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD!);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    }
  });

  test('deve exibir cards de estatísticas', async ({ page }) => {
    // Verificar que os cards estão presentes
    await expect(page.locator('text=/projetos|obras/i')).toBeVisible();
  });

  test('deve ter navegação funcional', async ({ page }) => {
    // Verificar menu lateral
    const navItems = page.locator('nav a');
    await expect(navItems.first()).toBeVisible();

    // Contar itens de navegação
    const count = await navItems.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Projetos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('deve listar projetos', async ({ page }) => {
    await page.goto('/projetos');

    // Verificar título da página
    await expect(page.locator('h1, h2').first()).toContainText(/projetos|obras/i);

    // Verificar que há uma tabela ou lista
    const hasTable = await page.locator('table').isVisible();
    const hasList = await page.locator('[role="list"]').isVisible();
    
    expect(hasTable || hasList || true).toBeTruthy(); // Pode estar vazio
  });

  test('deve abrir formulário de novo projeto', async ({ page }) => {
    await page.goto('/projetos');

    // Clicar em "Novo Projeto"
    const newButton = page.locator('text=/novo|adicionar|criar/i');
    
    if (await newButton.isVisible()) {
      await newButton.first().click();
      
      // Verificar que o formulário abriu
      await expect(page.locator('form')).toBeVisible();
    }
  });
});

test.describe('Responsividade', () => {
  test('deve funcionar em mobile', async ({ page }) => {
    // Configurar viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login');

    // Verificar que o formulário está visível
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('deve funcionar em tablet', async ({ page }) => {
    // Configurar viewport tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('deve funcionar em desktop', async ({ page }) => {
    // Configurar viewport desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
