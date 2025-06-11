/**
 * Convert {@link FormData} to object with string values. Blank parameters are
 * turned into `defaultValue`.
 * @param formData
 * @param defaultValue
 * @returns
 */
export function formDataToStringObject<T>(formData: FormData, defaultValue: T) {
	return Object.fromEntries(
		formData.entries().map(([k, v]: [string, FormDataEntryValue]): [string, string | T] => {
			if (v === '') return [k, defaultValue];
			else return [k, String(v)];
		})
	);
}
