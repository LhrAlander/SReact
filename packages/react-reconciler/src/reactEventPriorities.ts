import {
	DefaultLane,
	getHighestPriorityLane,
	IdleLane,
	includesNonIdleWork,
	InputContinuousLane,
	Lane,
	Lanes,
	NoLane,
	SyncLane
} from './reactFiberLane';

export type TEventPriority = Lane;

export enum EEventPriority {
	DISCRETE = SyncLane,
	CONTINUOUS = InputContinuousLane,
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

export function isHigherEventPriority(a: EEventPriority, b: EEventPriority) {
	return a < b;
}

export function lanesToEventPriority(lanes: Lanes): EEventPriority {
	const lane = getHighestPriorityLane(lanes);
	if (isHigherEventPriority(lane, EEventPriority.DISCRETE)) {
		return EEventPriority.DISCRETE;
	}

	if (isHigherEventPriority(lane, EEventPriority.CONTINUOUS)) {
		return EEventPriority.CONTINUOUS;
	}

	if (includesNonIdleWork(lanes)) {
		return EEventPriority.DEFAULT;
	}

	return EEventPriority.IDLE;
}
