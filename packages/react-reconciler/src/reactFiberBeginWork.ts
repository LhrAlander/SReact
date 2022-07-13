import { Lanes } from './reactFiberLane';
import { Fiber } from './reactFiber';

export function beginWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes
): Fiber | null {
	console.log('begin work', { current, workInProgress, renderLanes });
	return null;
}
