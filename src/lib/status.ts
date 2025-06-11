/**
 * Convenient HTTP status enum
 */
export enum Status {
	OK = 200,
	Created = 201,
	Accepted = 202,
	BadRequest = 400,
	Unauthorized = 401,
	PaymentRequired = 402,
	Forbidden = 403,
	NotFound = 404,
	MethodNotAllowed = 405,
	InternalServerError = 500,
	NotImplemented = 501,
}
