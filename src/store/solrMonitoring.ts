import { defineStore } from "pinia";
import { api } from "@common";
import logger from "@/logger";

/**
 * Solr health monitoring store.
 *
 * The Maarg backend exposes thin, read-only proxies over out-of-the-box Solr admin APIs
 * (admin/solr/*). Each proxy returns Solr's JSON verbatim under `response`, wrapped in an
 * { ok, httpStatus, response, errorMessage } envelope. This store fans out to those endpoints
 * and does all aggregation + health derivation client-side, producing a normalized `summary`
 * object the view renders.
 *
 * NOTE: the exact Solr JSON field paths (COLSTATUS doc counts / sizes especially) should be
 * validated against a live Solr 8.11 SolrCloud; parsing here is defensive and degrades to
 * "Unknown" rather than throwing.
 */

interface AdminEnvelope {
  ok?: boolean;
  httpStatus?: number;
  response?: any;
  errorMessage?: string;
}

async function adminGet(url: string, params?: Record<string, any>): Promise<AdminEnvelope> {
  try {
    const resp = await api({ url, method: "GET", params });
    return (resp.data || {}) as AdminEnvelope;
  } catch (error: any) {
    logger.error(`Solr monitoring request failed: ${url}`, error);
    return { ok: false, response: null, errorMessage: error?.message };
  }
}

function formatBytes(value: any): string | undefined {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, exponent)).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

// Count replicas whose state is not "active" across all shards of all cluster collections.
function countDownReplicas(clusterCollections: Record<string, any>): number {
  let down = 0;
  Object.values(clusterCollections || {}).forEach((collection: any) => {
    Object.values(collection?.shards || {}).forEach((shard: any) => {
      Object.values(shard?.replicas || {}).forEach((replica: any) => {
        if (replica?.state && replica.state !== "active") down += 1;
      });
    });
  });
  return down;
}

export const useSolrMonitoringStore = defineStore("solrmonitoring", {
  state: () => ({
    summary: {} as Record<string, any>,
    isLoading: false,
    lastLoadedAt: ""
  }),
  getters: {
    getSummary: (state: any) => state.summary,
    getOverview: (state: any) => state.summary.overview || {},
    getSystem: (state: any) => state.summary.system || {},
    getCollections: (state: any) => state.summary.collections || [],
    getPings: (state: any) => state.summary.pings || [],
    getZookeeper: (state: any) => state.summary.zookeeper || {},
    getMetrics: (state: any) => state.summary.metrics || {},
    getConfig: (state: any) => state.summary.config || {},
    getChecks: (state: any) => state.summary.overview?.checks || []
  },
  actions: {
    async fetchSummary() {
      this.isLoading = true;
      try {
        const [configEnv, systemEnv, clusterEnv, colEnv, zkEnv, metricsEnv] = await Promise.all([
          adminGet("admin/solr/config"),
          adminGet("admin/solr/system"),
          adminGet("admin/solr/cluster"),
          adminGet("admin/solr/collections"),
          adminGet("admin/solr/zookeeper"),
          adminGet("admin/solr/metrics")
        ]);

        // admin/solr/config returns factory fields at the top level (not under `response`).
        const config: any = configEnv || {};
        const instanceName: string = config.instanceName || "";
        const shared: Array<string> = config.sharedCollections || [];
        const logicalCollections: Array<string> = Array.from(
          new Set([config.defaultCollection, ...shared].filter(Boolean))
        );
        const toActual = (logical: string) =>
          shared.includes(logical) || !instanceName ? logical : `${instanceName}-${logical}`;

        // Ping each monitored collection.
        const pings = await Promise.all(
          logicalCollections.map(async (logical) => {
            const actual = toActual(logical);
            const env = await adminGet(`admin/solr/collections/${actual}/ping`);
            const header = env.response?.responseHeader || {};
            const ok = env.ok === true && (env.response?.status === "OK" || header.status === 0);
            return { name: logical, actualName: actual, ok, qTime: header.QTime, errorMessage: env.errorMessage };
          })
        );

        // System info.
        const sysResp = systemEnv.response || {};
        const lucene = sysResp.lucene || {};
        const jvm = sysResp.jvm || {};
        const rawMem = jvm.memory?.raw || {};
        const system = {
          solrVersion: lucene["solr-spec-version"],
          luceneVersion: lucene["lucene-spec-version"],
          jvmVersion: jvm.version,
          memory: { used: rawMem.used, max: rawMem.max, free: rawMem.free, total: rawMem.total }
        };

        // Collections: merge COLSTATUS (index stats) with CLUSTERSTATUS (health, replica state).
        const colResp = colEnv.response || {};
        const clusterCollections = clusterEnv.response?.cluster?.collections || {};
        const collections = logicalCollections.map((logical) => {
          const actual = toActual(logical);
          const col = colResp[actual] || {};
          const clusterCol = clusterCollections[actual] || {};
          let numDocs = 0;
          let sizeBytes = 0;
          let haveDocs = false;
          Object.values(col.shards || {}).forEach((shard: any) => {
            const leader = shard?.leader || {};
            const docs = leader?.segInfos?.info?.numDocs;
            if (typeof docs === "number") { numDocs += docs; haveDocs = true; }
            if (typeof leader?.sizeInBytes === "number") sizeBytes += leader.sizeInBytes;
          });
          return {
            name: logical,
            actualName: actual,
            numDocs: haveDocs ? numDocs : undefined,
            size: formatBytes(sizeBytes),
            health: clusterCol.health || col.health,
            exists: Object.keys(col).length > 0 || Object.keys(clusterCol).length > 0
          };
        });

        // ZooKeeper ensemble health.
        const zk = zkEnv.response?.zkStatus || {};
        const zookeeper = {
          ok: zkEnv.ok === true,
          status: zk.status,
          ensembleSize: zk.ensembleSize,
          zkHost: zk.zkHost,
          details: zk.details || [],
          errorMessage: zkEnv.errorMessage
        };

        // API coverage checks.
        const checks = [
          { id: "system", label: "System info API", ok: systemEnv.ok === true },
          { id: "cluster", label: "Cluster status API", ok: clusterEnv.ok === true },
          { id: "collections", label: "Collection status API", ok: colEnv.ok === true },
          { id: "zookeeper", label: "ZooKeeper status API", ok: zkEnv.ok === true },
          { id: "metrics", label: "Metrics API", ok: metricsEnv.ok === true }
        ];

        // Overall health derivation.
        const downReplicas = countDownReplicas(clusterCollections);
        const zkStatus = (zk.status || "").toString().toLowerCase();
        const anyPingFail = pings.some((p) => !p.ok);
        const apiFailures = checks.filter((c) => !c.ok).length;
        let health = "GREEN";
        if (zkStatus === "red" || downReplicas > 0 || apiFailures >= 2) health = "RED";
        else if (zkStatus === "yellow" || anyPingFail || apiFailures === 1) health = "YELLOW";

        this.summary = {
          generatedAt: new Date().toISOString(),
          config: {
            solrUrl: config.baseUrl,
            instanceName,
            defaultCollection: config.defaultCollection,
            sharedCollections: shared
          },
          overview: { health, checks, downReplicas },
          system,
          collections,
          pings,
          zookeeper,
          metrics: metricsEnv.response?.metrics || {}
        };
        this.lastLoadedAt = new Date().toISOString();
      } catch (error) {
        logger.error("Failed to build Solr monitoring summary", error);
      } finally {
        this.isLoading = false;
      }
    }
  }
});
