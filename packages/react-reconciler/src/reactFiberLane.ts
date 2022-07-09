export type Lane = number;
export type Lanes = number;

const TotalLanes = 31;
export const NoLane = /*                                */ 0b0000000000000000000000000000000;
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;
export const IdleLane: Lane = /*                        */ 0b0100000000000000000000000000000;

export const NoTimestamp = -1;

export function createLaneMap<T>(initial: T): T[] {
	const map = [];
	for (let i = 0; i < TotalLanes; i++) {
		map.push(initial);
	}
	return map;
}

export function mergeLanes(a: Lane, b: Lane) {
	return a | b;
}
