/***
 *
 * 在这个阶段，这个文件充当的角色是：代码调用render函数的时候，准备好一切update，进入到这里进行 scheduleUpdateOnFiber
 * 后续这个文件也是整个react render 的核心逻辑
 *
 * **/
import { createWorkInProgress, Fiber, FiberNodeMode } from './reactFiber';
import {
	getHighestPriorityLane,
	getNextLanes,
	includesBlockingLane,
	includesExpiredLane,
	Lane,
	Lanes,
	markRootUpdated,
	markStarvedLanesAsExpired,
	NoLane
} from './reactFiberLane';
import {
	EEventPriority,
	getCurrentUpdatePriority,
	lanesToEventPriority
} from './reactEventPriorities';
import { FiberRootNode } from './reactFiberRoot';
import { EScheduledJobPriority, IScheduledTask, scheduler } from 'scheduler';
import { getCurrentEventPriority } from 'react-dom';
import { finishQueueingUpdates } from './reactFiberUpdateQueue';
import { beginWork } from './reactFiberBeginWork';
import { completeWork } from './reactFiberCompleteWork';

let workInProgressRoot: FiberRootNode | null = null;
let workInProgressRootRenderLanes: Lanes = NoLane;

let subtreeRenderLanes: Lanes = NoLane;

enum EExcutionContext {
	NO = 0b000,
	BATCHED = 0b001,
	RENDER = 0b010,
	COMMIT = 0b100
}

let executionContext: EExcutionContext = EExcutionContext.NO;
let workInProgress: Fiber | null = null;

export function requestUpdateLane(fiber: Fiber): Lane {
	if (fiber.mode !== FiberNodeMode.CONCURRENT) {
		return NoLane;
	}

	// 一些特殊情况暂不做处理，我们优先处理正常流程

	// 当前的更新是由 React 代理事件 或者 React 调度的更新
	const currentUpdateLane = getCurrentUpdatePriority();
	if (currentUpdateLane !== NoLane) {
		return currentUpdateLane;
	}

	return getCurrentEventPriority();
}

export function scheduleUpdateOnFiber(
	root: FiberRootNode,
	fiber: Fiber,
	eventTime: number,
	lane: Lane
) {
	markRootUpdated(root, lane, eventTime);
	// TODO: 见注释
	// 这里会出现两个特殊场景
	// 1. 在render阶段出现了新的update，我们暂且不做处理
	// 2. 类似1，我们都不做处理，后续写到了再来看怎么解释
	ensureRootIsScheduled(root, eventTime);
	// TODO: Sync mode
	// 这里如果是Sync模式，就会有Sync的调度，我们暂不考虑
	if ((fiber.mode & FiberNodeMode.CONCURRENT) === FiberNodeMode.NO) {
		console.log('render sync');
	}
}

// 此函数用于两件事：
// 1. 确保一个 fiberRootNode 已经被调度任务，并且保证一个 fiberRootNode 只会有一个调度任务
// 2. 如果一个 fiberRootNode 已经被调度，则确保调度的任务的优先级就是该 fiberRootNode 的下一个最高优先级任务
// 同时，该函数会在两种场景被调用： 每一次更新 + 每一次 fiberRootNode 的任务执行完成
function ensureRootIsScheduled(root: FiberRootNode, eventTime: number) {
	const existingCallbackNode = root.callbackNode;
	// 因为React存在优先级的概念，一定有一些任务会被饿死，我们要保证过期任务最高执行
	markStarvedLanesAsExpired(root, eventTime);
	const nextLanes = getNextLanes(
		root,
		root === workInProgressRoot ? workInProgressRootRenderLanes : NoLane
	);

	if (nextLanes === NoLane) {
		// 这是个特殊情况：当前没有任何工作需要调度
		if (existingCallbackNode !== null) {
			scheduler.cancelTask(existingCallbackNode);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	// 当一次任务调度完成后 或者 新的调度任务产生了，就要在这里判断优先级
	const newCallbackPriority = getHighestPriorityLane(nextLanes);
	if (newCallbackPriority === root.callbackPriority) {
		// 新的更新与现在更新的调度任务优先级一致，无需调度
		return;
	}

	if (existingCallbackNode !== null) {
		scheduler.cancelTask(existingCallbackNode);
	}

	// 开始调度一个新的任务
	let newCallbackNode: null | IScheduledTask = null;
	let schedulerPriority: EScheduledJobPriority = EScheduledJobPriority.NORMAL;
	// TODO: SyncLane
	// 这里有一段 SyncLane 的处理，但是我们暂时不做考虑，等我们 concurrent mode处理完了，再回来看为什么这么做
	switch (lanesToEventPriority(nextLanes)) {
		case EEventPriority.DISCRETE:
			schedulerPriority = EScheduledJobPriority.IMMEDIATE;
			break;
		case EEventPriority.CONTINUOUS:
			schedulerPriority = EScheduledJobPriority.USER_BLOCKING;
			break;
		case EEventPriority.IDLE:
			schedulerPriority = EScheduledJobPriority.IDLE;
			break;
		default:
			schedulerPriority = EScheduledJobPriority.NORMAL;
			break;
	}

	newCallbackNode = scheduler.scheduleJob(
		performConcurrentWorkOnRoot.bind(null, root),
		{ priorityLevel: schedulerPriority }
	);

	root.callbackPriority = newCallbackPriority;
	root.callbackNode = newCallbackNode;
}

/**
 * 这个方法是每一个 concurrent 模式下的任务的入口方法，其中 root 是通过bind绑定的参数
 * didTimout 是 scheduler 调度的入参
 * 这个函数只会被 scheduler 调度
 * 这个函数就是真正render的逻辑流程
 * @param root
 * @param didTimeout
 */
function performConcurrentWorkOnRoot(root: FiberRootNode, didTimeout: boolean) {
	console.log('perform concurrent work on root', root, didTimeout);
	// TODO: passive effects
	// 这里会有一段关于effect的逻辑，这个是特殊情况，我们也暂时先跳过

	const lanes = getNextLanes(
		root,
		root === workInProgressRoot ? workInProgressRootRenderLanes : NoLane
	);
	if (lanes === NoLane) {
		return;
	}

	const shouldTimeSlice =
		!includesBlockingLane(lanes) &&
		!includesExpiredLane(root, lanes) &&
		!didTimeout;

	const exitStatus = shouldTimeSlice
		? renderRootConcurrent(root, lanes)
		: renderRootSync(root, lanes);
	console.log('render result', exitStatus);
}

function renderRootConcurrent(root: FiberRootNode, lanes: Lanes) {
	console.log('render root in concurrent mode', { root, lanes });
}

function renderRootSync(root: FiberRootNode, lanes: Lanes) {
	const prevExecutionContext = executionContext;
	executionContext |= EExcutionContext.RENDER;
	if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
		// TODO: transition
		// 这里还有一段处理 事物 的逻辑，暂且不提
		prepareFreshStack(root, lanes);
	}

	do {
		try {
			workLoopSync();
			break;
		} catch (e) {
			console.log(e);
		}
	} while (true);
	executionContext = prevExecutionContext;
}

function prepareFreshStack(root: FiberRootNode, lanes: Lanes): Fiber {
	root.finishedLanes = NoLane;
	root.finishedWork = null;
	// TODO: interrupt work
	// 这里有一段打断work的逻辑，暂且跳过，因为我也还不知道什么时候会进入这段逻辑
	workInProgressRoot = root;
	workInProgressRootRenderLanes = lanes;
	subtreeRenderLanes = lanes;
	const rootWorkInProgress = createWorkInProgress(root.current!, null);
	workInProgress = rootWorkInProgress;
	finishQueueingUpdates();
	return rootWorkInProgress;
}

// React fiber 树的遍历是一个 DFS，深度的表示为：优先一路beginWork到叶子fiber
// 对叶子fiber进行completeWork操作，检测叶子fiber是否有兄弟fiber，如果有，对其进行新一轮 DFS；
// 如果没有 返回叶子fiber的父fiber，进行CompleteWork操作，随后检测其兄弟fiber，如此反复
// 最终会归到最顶层的FiberRootNode.current fiber节点，此时整个处理fiber树信息的流程结束
function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

// 将workInProgress更新为子Fiber
function performUnitOfWork(unitOfWork: Fiber) {
	const current = unitOfWork.alternate;
	const next = beginWork(current, unitOfWork, subtreeRenderLanes);
	if (next === null) {
		completeUnitOfWork(unitOfWork);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(unitOfWork: Fiber) {
	let completedWork: Fiber | null = unitOfWork;
	do {
		const current = unitOfWork.alternate;
		const returnFiber: Fiber | null = completedWork.return;
		completeWork(current, completedWork, subtreeRenderLanes);
		if (unitOfWork.sibling !== null) {
			// 此时会跳到 workLoop 中去进行新一轮 DFS
			workInProgress = unitOfWork.sibling;
			return;
		}
		// 此时该层所有叶子fiber遍历完成，归到父Fiber中去进行completeWork
		completedWork = returnFiber;
	} while (completedWork !== null);
}
