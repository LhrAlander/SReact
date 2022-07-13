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
	// 这个属性用来暂存一批update，每次workLoop开始前会将这批update放到pending上去
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

let queues: Array<ISharedQueue<unknown>> | null = null;

export function pushUpdateQueue(queue: ISharedQueue<unknown>) {
	if (queues === null) {
		queues = [queue];
		return;
	}
	queues.push(queue);
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
		// 已解决，见注释：源码中会保存所有fiber的updateQueue的做法，没理清楚先不做
		// 这里我们再次理解pendings：即将开始的workloop中需要更新的信息，这是个批量更新的过程，那么
		// 有一个缓存 一批update 的过程 + 将缓存的update真正推入更新的过程
		pushUpdateQueue(shared);
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

export function finishQueueingUpdates() {
	if (queues === null) {
		return;
	}

	for (let i = 0; i < queues.length; i++) {
		const queue = queues[i];
		const lastInterleavedUpdate = queue.interleaved;
		if (lastInterleavedUpdate !== null) {
			queue.interleaved = null;
			const firstInterleavedUpdate = lastInterleavedUpdate.next;
			const lastPendingUpdate = queue.pending;
			if (lastPendingUpdate !== null) {
				const firstPendingUpdate = lastPendingUpdate.next;
				lastPendingUpdate.next = firstInterleavedUpdate;
				lastInterleavedUpdate.next = firstPendingUpdate;
			}
			queue.pending = lastInterleavedUpdate;
		}
	}
	queues = null;
}
