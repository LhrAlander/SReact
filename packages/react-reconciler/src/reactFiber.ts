import { WorkTag } from './reactWorkTag';
import { Flags, NoFlags, StaticMask } from './reactFiberFlags';
import { Lanes, NoLane } from './reactFiberLane';
import { RootTag } from '../index';
import { IUpdateQueue } from './reactFiberUpdateQueue';

export enum FiberNodeMode {
	NO = 0b000000,
	CONCURRENT = 0b000001
}

export class Fiber {
	// 实例属性
	tag: WorkTag;
	key: string | null;
	// 暂时未明确定义的属性
	elementType: null;
	type: null;
	stateNode: null | unknown;

	// fiber 连接相关
	return: Fiber | null;
	child: Fiber | null;
	sibling: Fiber | null;
	index: number;

	// render相关信息
	pendingProps: unknown;
	memoizedProps: unknown;
	updateQueue: null | IUpdateQueue<unknown>;
	memoizedState: null | unknown;
	dependencies: null;
	mode: FiberNodeMode;

	// effects处理
	flags: Flags;

	lanes: Lanes;
	childLanes: Lanes;
	alternate: Fiber | null;

	constructor(
		tag: WorkTag,
		pendingProps: unknown,
		key: null | string,
		mode: FiberNodeMode
	) {
		this.tag = tag;
		this.pendingProps = pendingProps;
		this.key = key;
		this.mode = mode;

		this.elementType = null;
		this.type = null;
		this.stateNode = null;

		this.return = null;
		this.child = null;
		this.sibling = null;
		this.index = 0;

		this.memoizedProps = null;
		this.updateQueue = null;
		this.memoizedState = null;
		this.dependencies = null;

		this.flags = NoFlags;

		this.lanes = NoLane;
		this.childLanes = NoLane;
		this.alternate = null;
	}
}

export function createHostRootFiber(tag: RootTag) {
	const mode =
		tag === RootTag.CONCURRENT ? FiberNodeMode.CONCURRENT : FiberNodeMode.NO;
	return new Fiber(WorkTag.HOST_ROOT, null, null, mode);
}

export function createWorkInProgress(
	current: Fiber,
	pendingProps: unknown
): Fiber {
	let workInProgress = current.alternate;
	if (workInProgress === null) {
		workInProgress = new Fiber(
			current.tag,
			pendingProps,
			current.key,
			current.mode
		);

		workInProgress.elementType = current.elementType;
		workInProgress.type = current.type;
		workInProgress.stateNode = current.stateNode;
		workInProgress.alternate = current;
		current.alternate = workInProgress;
	} else {
		workInProgress.pendingProps = pendingProps;
		workInProgress.type = current.type;
		workInProgress.flags = NoFlags;
	}

	workInProgress.flags = current.flags & StaticMask;
	workInProgress.childLanes = current.childLanes;
	workInProgress.lanes = current.lanes;

	workInProgress.child = current.child;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;
	workInProgress.updateQueue = current.updateQueue;

	workInProgress.sibling = current.sibling;
	workInProgress.index = current.index;
	return workInProgress;
}
