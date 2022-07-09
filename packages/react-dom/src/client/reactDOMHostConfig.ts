import { DefaultLane } from 'react-reconciler';

export function getCurrentEventPriority() {
	// 这里的代码我还不理解到底window.event怎么来的，所以我们跳过这一段代码直接返回DefaultLane
	return DefaultLane;
}
