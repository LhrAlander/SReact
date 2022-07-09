import { ReactNodeList } from 'react';
import { scheduler } from 'scheduler';
import { FiberRootNode } from './reactFiberRoot';
import { Fiber } from './reactFiber';
import { Lane } from './reactFiberLane';
import { requestUpdateLane, scheduleUpdateOnFiber } from './reactFiberWorkLoop';
import { createUpdate, enqueueUpdate } from './reactFiberUpdateQueue';

export function updateContainer(
	children: ReactNodeList,
	rootNode: FiberRootNode
) {
	const current: Fiber = rootNode.current!;
	const eventTime = scheduler.getCurrentTime();
	const lane: Lane = requestUpdateLane(current);

	const update = createUpdate(eventTime, lane);
	update.payload = {
		element: children
	};
	const root: FiberRootNode | null = enqueueUpdate(current, update, lane);
	if (root !== null) {
		scheduleUpdateOnFiber(root, current, eventTime, lane);
	}

	return lane;
}
