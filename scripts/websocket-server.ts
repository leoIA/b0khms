#!/usr/bin/env node
// =============================================================================
// ConstrutorPro - WebSocket Server Startup Script
// Script para iniciar o servidor WebSocket standalone
// =============================================================================

import { startWebSocketServer, wsManager, WEBSOCKET_CONFIG } from '../src/lib/realtime/websocket';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const PORT = parseInt(process.env.WEBSOCKET_PORT || '3001');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       ConstrutorPro - WebSocket Server                    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();

// Iniciar servidor
const server = startWebSocketServer(PORT);

// Handler para desligamento gracioso
process.on('SIGINT', () => {
  console.log('\n[WebSocket] Received SIGINT, shutting down gracefully...');
  wsManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[WebSocket] Received SIGTERM, shutting down gracefully...');
  wsManager.stop();
  process.exit(0);
});

// Log de estatísticas periódicas
setInterval(() => {
  const stats = wsManager.getStats();
  if (stats.totalConnections > 0) {
    console.log(`[WebSocket] Stats: ${stats.authenticatedConnections}/${stats.totalConnections} authenticated, ${stats.companies} companies, ${stats.activeProgressOperations} active operations`);
  }
}, 60000);

console.log(`[WebSocket] Server running on port ${PORT}`);
console.log(`[WebSocket] Heartbeat interval: ${WEBSOCKET_CONFIG.heartbeatInterval}ms`);
console.log(`[WebSocket] Ping interval: ${WEBSOCKET_CONFIG.pingInterval}ms`);
console.log();
console.log('Press Ctrl+C to stop the server');
