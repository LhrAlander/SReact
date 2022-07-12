import { FiberRootNode } from './reactFiberRoot';

export type Lane = number;
export type Lanes = number;

const TotalLanes = 31;
export const NoLane = /*                                */ 0b0000000000000000000000000000000;
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;
const NonIdleLanes: Lanes = /*                          */ 0b0001111111111111111111111111111;
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

/**
 * 1. 更新 root.pendingLanes
 * 2. 更新 root.eventTimes[index] = eventTime
 * @param root
 * @param updateLane
 * @param eventTime
 */
export function markRootUpdated(
	root: FiberRootNode,
	updateLane: Lane,
	eventTime: number
) {
	root.pendingLanes |= updateLane;
	const eventTimes = root.eventTimes;
	const index = laneToIndex(updateLane);
	eventTimes[index] = eventTime;
}

function pickArbitraryLaneIndex(lanes: Lanes) {
	return 31 - Math.clz32(lanes);
}

function laneToIndex(lane: Lane) {
	return pickArbitraryLaneIndex(lane);
}

export function markStarvedLanesAsExpired(
	root: FiberRootNode,
	currentTime: number
) {
	// 这里有几个概念我们暂且忽略：1. pingedLanes 2. suspendedLanes
	const pendingLanes = root.pendingLanes;
	const expirationTimes = root.expirationTimes;
	let lanes = pendingLanes;
	while (lanes > 0) {
		const index = pickArbitraryLaneIndex(lanes);
		const lane = 1 << index;
		const expirationTime = expirationTimes[index];
		if (expirationTime === NoTimestamp) {
		} else if (expirationTime <= currentTime) {
			root.expiredLanes |= lane;
		}

		lanes &= ~lane;
	}
}

function getHighestPriorityLanes(lanes: Lanes): Lanes {
	switch (getHighestPriorityLane(lanes)) {
		case SyncLane:
			return SyncLane;
		case InputContinuousLane:
			return InputContinuousLane;
		case DefaultLane:
			return DefaultLane;
		case IdleLane:
			return IdleLane;
		// TODO: transitionLane
		default:
			return DefaultLane;
	}
}

/**
 * 这里为什么不是Lane 而是 Lanes：因为React存在suspense transition，它们是需要被bailout处理的
 * 还存在retryLane，这些都是占据了多位lane的，其他情况都是 Lane
 *
 * @param root
 * @param wipLanes 正在render的lane
 */
export function getNextLanes(root: FiberRootNode, wipLanes: Lanes): Lanes {
	const pendingLanes = root.pendingLanes;
	if (pendingLanes === NoLane) {
		return NoLane;
	}

	let nextLanes = NoLane;
	const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
	if (nonIdlePendingLanes !== NoLane) {
		// TODO: suspend
		// 这里有一段判断 suspendLanes 的代码，我们暂不做处理
		nextLanes = getHighestPriorityLanes(nonIdlePendingLanes);
	}
	if (nextLanes === NoLane) {
		return NoLane;
	}

	// 这里是比较重要的一步：如果正在运行的lane（wipLane）的优先级比 当前算出来的 nextLanes 优先级高，则继续运行
	if (wipLanes !== NoLane && wipLanes !== nextLanes) {
		const nextLane = getHighestPriorityLane(nextLanes);
		const wipLane = getHighestPriorityLane(wipLanes);
		if (nextLane >= wipLane) {
			return wipLanes;
		}
	}

	// TODO: entangledLanes 纠缠
	// 这里React处理了关于 纠缠的lane ，我们暂不做处理直接返回nextLanes
	return nextLanes;
}

// 这个方法纯算法，一个二进制数，React 低位优先
// 比如 0b0100001011100010，最右边的 1 就是最高优先级，应该被返回
export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}

export function includesNonIdleWork(lanes: Lanes) {
	return (lanes & NonIdleLanes) !== NoLane;
}
