import { includesSomeLane, Lanes } from './reactFiberLane';
import { Fiber } from './reactFiber';

let didReceiveUpdate = false;

export function beginWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes
): Fiber | null {
	if (current !== null) {
		const oldProps = current.memoizedProps;
		const pendingProps = workInProgress.pendingProps;
		if (oldProps !== pendingProps) {
			didReceiveUpdate = true;
		} else {
			// 如果说 组件没有收到新的props，那么检查其自身是否需要更新，两种情况需要更新
			// 1. 本身具有pendingLanes
			// 2. context发生了变化，我们这里先不讨论context只讨论第一种
			const hasScheduledUpdateOrContext = includesSomeLane(
				renderLanes,
				current.lanes
			);
			didReceiveUpdate = false;
			if (!hasScheduledUpdateOrContext) {
				return attemptEarlyBailoutIfNoScheduledUpdate(
					current,
					workInProgress,
					renderLanes
				);
			}
		}
	} else {
		didReceiveUpdate = false;
	}
	return null;
}

function attemptEarlyBailoutIfNoScheduledUpdate(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes
): Fiber | null {
	return null;
}
