import { useCallback, useEffect, useState } from 'react';
import API, { getErrorMessage } from '../services/api.js';

/**
 * GETs `url` with optional query `params`, refetching whenever either changes.
 * Pass `null` as the url to skip the request. Previous data stays visible while a new request
 * loads, which avoids flicker when paging or filtering. Call `reload()` after changing data.
 */
export function useApi(url, params) {
  const [version, setVersion] = useState(0);
  const paramsKey = JSON.stringify(params ?? {});
  const requestKey = url ? `${url}?${paramsKey}#${version}` : null;
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    API.get(url, { params: JSON.parse(paramsKey), signal: controller.signal })
      .then(({ data }) => setResult({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setResult((previous) => ({ key: requestKey, data: previous.data, error: getErrorMessage(error) }));
      });
    return () => controller.abort();
  }, [url, paramsKey, requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data: result.data,
    error: result.key === requestKey ? result.error : null,
    loading: requestKey !== null && result.key !== requestKey,
    reload,
  };
}
