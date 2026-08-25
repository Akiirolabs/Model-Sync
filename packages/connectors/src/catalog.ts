export type ConnectorInfo = {
  id: string;
  label: string;
  status: "ready" | "not_configured";
  description: string;
};

export const CONNECTORS: ConnectorInfo[] = [
  {
    id: "file-metrics",
    label: "Local files",
    status: "ready",
    description: "Upload or register CSV/JSON metrics under a sandboxed root.",
  },
  {
    id: "mlflow",
    label: "MLflow",
    status: "not_configured",
    description: "Connect an MLflow tracking server (stub).",
  },
  {
    id: "wandb",
    label: "Weights & Biases",
    status: "not_configured",
    description: "Connect a W&B project (stub).",
  },
];

export function listConnectors(): ConnectorInfo[] {
  return CONNECTORS;
}
