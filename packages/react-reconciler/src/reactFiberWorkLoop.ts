/***
 *
 * 在这个阶段，这个文件充当的角色是：代码调用render函数的时候，准备好一切update，进入到这里进行 scheduleUpdateOnFiber
 * 后续这个文件也是整个react render 的核心逻辑
 *
 * **/
import { Fiber, FiberNodeMode } from './reactFiber';
import { NoLane, Lane } from './reactFiberLane';
import {
	EEventPriority,
	getCurrentUpdatePriority
} from './reactEventPriorities';
import { FiberRootNode } from './reactFiberRoot';

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

	return EEventPriority.DEFAULT;
}

export function scheduleUpdateOnFiber(
	root: FiberRootNode,
	fiber: Fiber,
	eventTime: number,
	lane: Lane
) {
	console.log('start scheduling update on fiber', {
		root,
		fiber,
		eventTime,
		lane
	});
}
