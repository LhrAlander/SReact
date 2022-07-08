interface ISortableNodeLike {
	id: number;
	sortIndex: number;
}

export class MinHeap<T extends ISortableNodeLike> {
	heap: T[];

	constructor() {
		this.heap = [];
	}

	push(node: T) {
		const idx = this.heap.length;
		this.heap.push(node);
		this.siftUp(node, idx);
	}

	pop() {
		if (this.heap.length === 0) {
			return null;
		}

		const first = this.heap[0];
		const lastNode = this.heap.pop();

		if (lastNode !== first) {
			this.heap[0] = lastNode!;
			this.siftDown(lastNode!, 0);
		}
		return first;
	}

	peek() {
		return this.heap.length > 0 ? this.heap[0] : null;
	}

	private siftUp(node: T, idx: number) {
		let i = idx;
		while (i > 0) {
			const parentIdx = Math.floor((i - 1) / 2);
			const parent = this.heap[parentIdx];
			if (this.compareNode(parent, node) > 0) {
				this.heap[parentIdx] = node;
				this.heap[i] = parent;
				i = parentIdx;
			} else {
				return;
			}
		}
	}

	private siftDown(node: T, idx: number) {
		let i = idx;
		while (true) {
			const leftIdx = i * 2 + 1;
			const rightIdx = i * 2 + 2;
			const leftNode = this.heap[leftIdx];
			const rightNode = this.heap[rightIdx];
			if (!leftNode && !rightNode) {
				return;
			}
			if (leftNode && this.compareNode(leftNode, node) < 0) {
				if (rightNode && this.compareNode(leftNode, rightNode) > 0) {
					this.heap[i] = rightNode;
					this.heap[rightIdx] = node;
					i = rightIdx;
				} else {
					this.heap[i] = leftNode;
					this.heap[leftIdx] = node;
					i = leftIdx;
				}
			} else if (rightNode && this.compareNode(rightNode, node) < 0) {
				this.heap[i] = rightNode;
				this.heap[rightIdx] = node;
				i = rightIdx;
			} else {
				return;
			}
		}
	}

	private compareNode(a: T, b: T) {
		const sortIndexDiff = a.sortIndex - b.sortIndex;
		return sortIndexDiff === 0 ? a.id - b.id : sortIndexDiff;
	}
}
