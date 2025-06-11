/** Longitude, latitude */
export type MapLocation = [number, number];

export type SourceToTarg = {
	distance: number | null;
	time: number | null;
	source_index: number;
	target_index: number;
};
