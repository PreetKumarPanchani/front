import pg from 'postgres';

enum PgError {
	DuplicateKey,
	Unknown,
}
type PgErrorReturn = { type: PgError; msg: string };

/**
 * Convert full-length postgress error to returnable version.
 * @param e
 * @returns
 */
function wrapPgError(e: pg.PostgresError): PgErrorReturn {
	if (e.code === '23505' && e.detail) {
		return {
			type: PgError.DuplicateKey,
			msg: e.detail,
		};
		// {"length":211,"name":"error","severity":"ERROR","code":"23505","detail":"Key (email)=(a@a.com) already exists.","schema":"public","table":"drivers","constraint":"drivers_email_unique","file":"nbtinsert.c","line":"673","routine":"_bt_check_unique"}
	}
	// console.log(e);
	// const msg = `Unknown error when interacting with db. Code ${e.code}: ${e.detail}.`;
	// can leak architecture of db so have to use less specific version.
	const msg = 'Unknown error when interacting with db.';
	return { type: PgError.Unknown, msg };
}

/**
 * Convenient wrapper for {@link wrapPgError}.
 * @param e
 * @returns
 */
export const wrapPgErrorUntyped = (e: any) => wrapPgError(e);
