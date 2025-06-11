/**
 * Time out the current function.
 * @param ms Time to sleep for
 * @returns Sleep promise
 * @example
 * await sleep(100);
 * do_more_processing();
 */
export function sleep(ms: number): Promise<any> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
