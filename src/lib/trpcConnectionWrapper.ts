import { err, ok, Result } from 'neverthrow';

/**
 * Convert a JSON-ified neverthrow {@link Result} back into a class.
 * @param result
 * @returns
 * @example
 * const res = ok(obj);
 * const returnedRes = JSON.parse(JSON.stringify(res));
 * const wrapped = wrapTrpcResult(returnedRes);
 * assertEqual(res, wrapped);
 */
export function wrapTrpcResult<T, E>(result: { readonly value: T } | { readonly error: E }) {
	if ('value' in result) return ok(result.value as T);
	else if ('error' in result) return err(result.error);
	else throw new Error('Something went really wrong with wrapping the result');
}
