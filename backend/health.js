// backend/health.js
// Health check endpoints para monitoramento em produção

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool(); // Reutilizar pool existente

export const registerHealthEndpoints = (app) => {
  /**
   * GET /health
   * Retorna status da aplicação
   * Usado por: Docker health check, Load balancers, Monitoring
   */
  app.get('/health', async (req, res) => {
    try {
      // Teste rápido: verificar se BD responde
      const result = await pool.query('SELECT NOW()');
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.BUILD_VERSION || 'unknown',
        environment: process.env.NODE_ENV || 'unknown',
        uptime: Math.floor(process.uptime()),
        database: 'ok',
        checks: {
          api: 'ok',
          database: result.rows.length > 0 ? 'ok' : 'error'
        }
      });
    } catch (error) {
      console.error('[Health Check] Database error:', error.message);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.BUILD_VERSION || 'unknown',
        error: 'Database connection failed',
        checks: {
          api: 'ok',
          database: 'error'
        }
      });
    }
  });

  /**
   * GET /ready
   * Verificações mais rigorosas antes de aceitar tráfego
   * Usado por: Kubernetes readiness probe
   */
  app.get('/ready', async (req, res) => {
    try {
      // Verificação completa
      const dbReady = await isDbReady();
      const schemaOk = await isSchemaValid();

      if (dbReady && schemaOk) {
        res.json({
          ready: true,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          ready: false,
          database: dbReady,
          schema: schemaOk
        });
      }
    } catch (error) {
      console.error('[Ready Check] Error:', error.message);
      res.status(503).json({
        ready: false,
        error: error.message
      });
    }
  });

  /**
   * GET /live
   * Verificação de liveness (aplicação ainda está em execução?)
   * Usado por: Kubernetes liveness probe
   */
  app.get('/live', (req, res) => {
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
      pid: process.pid
    });
  });

  /**
   * GET /metrics
   * Métricas simples (pode ser expandido com Prometheus)
   */
  app.get('/metrics', async (req, res) => {
    const memUsage = process.memoryUsage();
    
    try {
      const result = await pool.query('SELECT count(*) as maps FROM maps');
      const mapCount = result.rows[0]?.maps || 0;

      res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        },
        application: {
          totalMaps: mapCount
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

// Funções auxiliares
async function isDbReady() {
  try {
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

async function isSchemaValid() {
  try {
    // Verificar se tabelas principais existem
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'maps'
      )
    `);
    return result.rows[0]?.exists || false;
  } catch {
    return false;
  }
}

export default { registerHealthEndpoints };
