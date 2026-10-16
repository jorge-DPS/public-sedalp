export const useApi = createUseFetch((options) => {
  const config = useRuntimeConfig();
  const requestHooks = options.onRequest
    ? (Array.isArray(options.onRequest) ? options.onRequest : [options.onRequest])
    : [];

  return {
    ...options,
    baseURL: options.baseURL ?? config.public.apiBase,
    timeout: options.timeout ?? 15000,
    onRequest: [
      ...requestHooks,
      ({ options }) => {
        options.headers.set("Accept", "application/json");
      },
    ],
  };
});

