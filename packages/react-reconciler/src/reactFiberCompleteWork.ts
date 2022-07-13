import { Lanes } from './reactFiberLane';
import { Fiber } from './reactFiber';

export function completeWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes
): Fiber | null {
	console.log('complete work', { current, workInProgress, renderLanes });
	return null;
}
