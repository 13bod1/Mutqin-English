import { Observable, delay, of } from 'rxjs';

/**
 * Simulates an HTTP response while the backend is not ready.
 * Every data service returns Observables, so swapping this for
 * `HttpClient.get<T>(url)` later does not change any component.
 */
export function mockResponse<T>(data: T, latencyMs = 250): Observable<T> {
  return of(structuredClone(data)).pipe(delay(latencyMs));
}
