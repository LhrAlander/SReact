import {
	Lanes,
	NoLane,
	RootTag,
	Lane,
	createLaneMap,
	NoTimestamp
} from '../index';
import { IScheduledTask } from 'scheduler';
import { ReactNodeList } from 'react';
import { createHostRootFiber, Fiber } from './reactFiber';
import { initializeUpdateQueue } from './reactFiberUpdateQueue';

export interface IHostRootFiberState {
	element: ReactNodeList | null;
}

export class FiberRootNode {
	tag: RootTag;
	containerInfo: Element;
	callbackNode: IScheduledTask | null;
	callbackPriority: Lane;
	eventTimes: number[];
	expirationTimes: number[];
	pendingLanes: Lanes;
	expiredLanes: Lanes;
	finishedLanes: Lanes;

	// 暂时未明确的定义
	pendingChildren: null;
	current: null | Fiber;
	finishedWork: null;

	// 还有一部分暂时没有理解的定义没定义出来，用到了再来写

	constructor(containerInfo: Element, tag: RootTag) {
		this.tag = tag;
		this.containerInfo = containerInfo;
		this.pendingChildren = null;
		this.current = null;
		this.finishedWork = null;
		this.callbackNode = null;
		this.callbackPriority = NoLane;
		this.pendingLanes = NoLane;
		this.expiredLanes = NoLane;
		this.finishedLanes = NoLane;
		this.eventTimes = createLaneMap(NoLane);
		this.expirationTimes = createLaneMap(NoTimestamp);
	}
}

export function createFiberRoot(container: Element, tag: RootTag) {
	const root = new FiberRootNode(container, tag);
	const uninitializedFiber = createHostRootFiber(tag);

	root.current = uninitializedFiber;
	uninitializedFiber.stateNode = root;

	const state: IHostRootFiberState = {
		element: null
	};

	uninitializedFiber.memoizedState = state;
	initializeUpdateQueue(uninitializedFiber);
	return root;
}
