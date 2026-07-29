export interface ApiStatus {
  service: "clinic-api";
  status: "ok";
  timestamp: string;
}

export function getApiStatus(): ApiStatus {
  return {
    service: "clinic-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}
