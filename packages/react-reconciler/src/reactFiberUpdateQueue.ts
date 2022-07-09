import { Lane, mergeLanes } from './reactFiberLane';
import { Fiber } from './reactFiber';
import { WorkTag } from './reactWorkTag';
import { FiberRootNode } from './reactFiberRoot';

export enum EUpdateTag {
	UPDATE_STATE,
	REPLACE_STATE
}
export interface IUpdate<State> {
	eventTime: number;
	lane: Lane;
	tag: EUpdateTag;
	payload: any;
	next: IUpdate<State> | null;
}

export interface ISharedQueue<State> {
	pending: IUpdate<State> | null;
	interleaved: IUpdate<State> | null;
}

export interface IUpdateQueue<State> {
	baseState: State;
	firstBaseUpdate: IUpdate<State> | null;
	lastBaseUpdate: IUpdate<State> | null;
	// shared的命名有点意思，后续可以关注下为什么叫shared
	shared: ISharedQueue<State>;
	effects: IUpdate<State>[] | null;
}

export function initializeUpdateQueue<State>(fiber: Fiber): void {
	const queue: IUpdateQueue<State> = {
		baseState: fiber.memoizedState as State,
		firstBaseUpdate: null,
		lastBaseUpdate: null,
		shared: {
			pending: null,
			interleaved: null
		},
		effects: null
	};

	fiber.updateQueue = queue;
}

export function createUpdate(eventTime: number, lane: Lane): IUpdate<any> {
	return {
		eventTime,
		lane,
		payload: null,
		next: null,
		tag: EUpdateTag.UPDATE_STATE
	};
}

export function enqueueUpdate(
	fiber: Fiber,
	update: IUpdate<unknown>,
	lane: Lane
): FiberRootNode | null {
	const updateQueue = fiber.updateQueue;
	if (updateQueue === null) {
		return null;
	}
	// 目前我们只做update的环状链表
	const shared = updateQueue.shared;
	if (shared.interleaved === null) {
		update.next = update;
		// 源码中会保存所有fiber的updateQueue的做法，没理清楚先不做
	} else {
		update.next = shared.interleaved.next;
		shared.interleaved.next = update;
	}

	shared.interleaved = update;

	return markUpdateLaneFromFiberToRoot(fiber, lane);
}

export function markUpdateLaneFromFiberToRoot(
	sourceFiber: Fiber,
	lane: Lane
): FiberRootNode | null {
	sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
	const alternate = sourceFiber.alternate;
	if (alternate !== null) {
		alternate.lanes = mergeLanes(alternate.lanes, lane);
	}

	let node = sourceFiber;
	let parent = node.return;

	while (parent !== null) {
		parent.childLanes = mergeLanes(parent.childLanes, lane);
		if (parent.alternate !== null) {
			parent.alternate.childLanes = mergeLanes(
				parent.alternate.childLanes,
				lane
			);
		}
		node = parent;
		parent = node.return;
	}

	if (node.tag === WorkTag.HOST_ROOT) {
		return node.stateNode! as FiberRootNode;
	}
	return null;
}
