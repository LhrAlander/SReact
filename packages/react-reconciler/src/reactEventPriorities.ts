import {
	DefaultLane,
	IdleLane,
	InputContinuousLane,
	Lane,
	NoLane,
	SyncLane
} from './reactFiberLane';

export type TEventPriority = Lane;

export enum EEventPriority {
	DISCRETE = SyncLane,
	INPUT_CONTINUOUS = InputContinuousLane,
	DEFAULT = DefaultLane,
	IDLE = IdleLane
}

let currentUpdatePriority: Lane = NoLane;

export function getCurrentUpdatePriority(): TEventPriority {
	return currentUpdatePriority;
}

export function setCurrentUpdatePriority(priority: EEventPriority) {
	currentUpdatePriority = priority;
}
