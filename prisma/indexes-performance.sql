-- =============================================================================
-- ConstrutorPro - Performance Indexes Migration
-- Composed indexes for frequently queried patterns
-- Run with: psql $DATABASE_URL -f prisma/indexes-performance.sql
-- =============================================================================

-- Projects: Common query patterns
-- Query by company + status (dashboard listing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_companyId_status_idx" ON "projects" ("companyId", "status");

-- Query by company + client (client projects view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_companyId_clientId_idx" ON "projects" ("companyId", "clientId");

-- Query by company + dates (reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_companyId_startDate_endDate_idx" ON "projects" ("companyId", "startDate", "endDate");

-- Transactions: Financial reports and dashboard
-- Query by company + type + date (monthly reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "transactions_companyId_type_date_idx" ON "transactions" ("companyId", "type", "date");

-- Query by company + status + dueDate (payable/receivable alerts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "transactions_companyId_status_dueDate_idx" ON "transactions" ("companyId", "status", "dueDate");

-- Query by company + project (project financial view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "transactions_companyId_projectId_idx" ON "transactions" ("companyId", "projectId");

-- Activities: Activity feed and audit
-- Query by company + createdAt (activity feed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "activities_companyId_createdAt_idx" ON "activities" ("companyId", "createdAt" DESC);

-- Query by user + createdAt (user activity)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "activities_userId_createdAt_idx" ON "activities" ("userId", "createdAt" DESC);

-- Budget Items: Budget analysis
-- Query by budget (budget detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "budget_items_budgetId_order_idx" ON "budget_items" ("budgetId", "order");

-- Compositions: Composition search
-- Query by company + active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "compositions_companyId_isActive_idx" ON "compositions" ("companyId", "isActive");

-- Materials: Stock alerts and search
-- Query by company + active + low stock (stock alerts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "materials_companyId_isActive_stockQuantity_idx" 
ON "materials" ("companyId", "isActive", "stockQuantity");

-- Daily Logs: Work diary reports
-- Query by project + date (work diary)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "daily_logs_projectId_date_idx" ON "daily_logs" ("projectId", "date" DESC);

-- Query by company + date (company reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "daily_logs_companyId_date_idx" ON "daily_logs" ("companyId", "date" DESC);

-- Schedule Tasks: Gantt chart and progress tracking
-- Query by schedule + dates (gantt view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "schedule_tasks_scheduleId_startDate_endDate_idx" 
ON "schedule_tasks" ("scheduleId", "startDate", "endDate");

-- Query by schedule + status (task board)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "schedule_tasks_scheduleId_status_idx" 
ON "schedule_tasks" ("scheduleId", "status");

-- Medicoes: Progress billing
-- Query by project + status (billing status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "medicoes_projectId_status_idx" ON "medicoes" ("projectId", "status");

-- Query by company + dates (billing reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "medicoes_companyId_dataInicio_dataFim_idx" 
ON "medicoes" ("companyId", "dataInicio", "dataFim");

-- Purchase Orders: Procurement tracking
-- Query by company + status (order tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "purchase_orders_companyId_status_idx" 
ON "purchase_orders" ("companyId", "status");

-- Query by supplier + status (supplier orders)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "purchase_orders_supplierId_status_idx" 
ON "purchase_orders" ("supplierId", "status");

-- Invoices: Subscription billing
-- Query by company + status (billing management)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "invoices_companyId_status_idx" ON "invoices" ("companyId", "status");

-- Query by due date (payment reminders)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "invoices_dueDate_status_idx" ON "invoices" ("dueDate", "status");

-- AI Conversations: Chat history
-- Query by company + user (user conversations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ai_conversations_companyId_userId_createdAt_idx" 
ON "ai_conversations" ("companyId", "userId", "createdAt" DESC);

-- Alerts: Notification system
-- Query by company + read status (notification badge)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "alerts_companyId_isRead_createdAt_idx" 
ON "alerts" ("companyId", "isRead", "createdAt" DESC);

-- Quotations: Procurement workflow
-- Query by company + status (quotation tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "quotations_companyId_status_idx" ON "quotations" ("companyId", "status");

-- Query by project (project quotations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "quotations_projectId_status_idx" ON "quotations" ("projectId", "status");

-- Quotation Responses: Supplier response tracking
-- Query by quotation + status (response comparison)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "quotation_responses_quotationId_status_idx" 
ON "quotation_responses" ("quotationId", "status");

-- =============================================================================
-- Partial Indexes for Common Filters
-- =============================================================================

-- Active projects only (most queries filter for active)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_active_idx" ON "projects" ("companyId", "status") 
WHERE "status" IN ('planning', 'in_progress');

-- Pending transactions (payables/receivables dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "transactions_pending_idx" ON "transactions" ("companyId", "dueDate") 
WHERE "status" = 'pending';

-- Unread alerts (notification badge)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "alerts_unread_idx" ON "alerts" ("companyId", "createdAt" DESC) 
WHERE "isRead" = false;

-- Active materials (stock management)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "materials_active_idx" ON "materials" ("companyId", "stockQuantity") 
WHERE "isActive" = true;

-- Active companies for subscription checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS "companies_active_subscription_idx" 
ON "companies" ("subscriptionStatus", "planExpiresAt") 
WHERE "isActive" = true;

-- =============================================================================
-- Analyze tables after index creation
-- =============================================================================
ANALYZE projects;
ANALYZE transactions;
ANALYZE activities;
ANALYZE budget_items;
ANALYZE compositions;
ANALYZE materials;
ANALYZE daily_logs;
ANALYZE schedule_tasks;
ANALYZE medicoes;
ANALYZE purchase_orders;
ANALYZE invoices;
ANALYZE ai_conversations;
ANALYZE alerts;
ANALYZE quotations;
ANALYZE quotation_responses;

-- =============================================================================
-- Comment on indexes for documentation
-- =============================================================================
COMMENT ON INDEX "projects_companyId_status_idx" IS 'Optimizes dashboard project listing by status';
COMMENT ON INDEX "transactions_companyId_type_date_idx" IS 'Optimizes financial reports by type and date range';
COMMENT ON INDEX "activities_companyId_createdAt_idx" IS 'Optimizes activity feed queries';
COMMENT ON INDEX "alerts_unread_idx" IS 'Partial index for unread notification count';
COMMENT ON INDEX "transactions_pending_idx" IS 'Partial index for pending payables/receivables';
