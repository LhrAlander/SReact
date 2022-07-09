import { createFiberRoot, FiberRootNode, RootTag } from 'react-reconciler';
import { ReactNodeList } from 'react';
import { updateContainer } from 'react-reconciler/src/reactFiberReconciler';

// 暂时该函数不需要options
export function createRoot(
	container: Element & { __sReactContainer$$?: FiberRootNode }
) {
	const root = createFiberRoot(container, RootTag.CONCURRENT);
	container[`__sReactContainer$$`] = root;
	// TODO: 这里会做事件代理，这个后续lanes & schedule priority 的关系理清楚以后再回来处理
	return new ReactDOMRoot(root);
}

class ReactDOMRoot {
	_internalRoot: FiberRootNode;

	constructor(root: FiberRootNode) {
		this._internalRoot = root;
	}

	render(children: ReactNodeList) {
		updateContainer(children, this._internalRoot);
	}
}
