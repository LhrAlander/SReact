import { MinHeap } from './minHeap';

export enum EScheduledJobPriority {
	NO,
	IMMEDIATE,
	USER_BLOCKING,
	NORMAL,
	LOW,
	IDLE
}

export enum EScheduledJobPriorityTimeout {
	IMMEDIATE = -1,
	USER_BLOCKING = 250,
	NORMAL = 5000,
	LOW = 10000,
	IDLE = Math.pow(2, 30) - 1
}

interface IJob {
	(didTimeout: boolean): any;
}

interface IScheduleOption {
	delay?: number;
	priorityLevel?: EScheduledJobPriority;
}

export interface IScheduledTask {
	id: number;
	job: IJob | null;
	priority: EScheduledJobPriority;
	startTime: number;
	expirationTime: number;
	sortIndex: number;
}

type HasMoreWork = boolean;

class Scheduler {
	// 已经在处理的task
	private taskHeap: MinHeap<IScheduledTask>;
	// 延时的task
	private timerHeap: MinHeap<IScheduledTask>;
	private taskIdCounter: number;
	// 是否已调度延时任务
	private isHostTimeoutScheduled: boolean;
	private taskTimeoutId: number;
	// 是否正在调度任务
	private isHostCallbackScheduled: boolean;
	// private isPerformingWork: boolean;

	// 正在调度的任务
	private scheduledHostCallback:
		| ((hasTimeRemaining: boolean, currentTime: number) => HasMoreWork)
		| null;

	// 此刻正在调度的任务的startTime
	private performWorkStartTime: number;
	// 此刻正在调度的任务的优先级
	private currentPriority: EScheduledJobPriority;

	constructor() {
		this.taskHeap = new MinHeap();
		this.timerHeap = new MinHeap();
		this.taskIdCounter = 1;
		this.isHostTimeoutScheduled = false;
		this.taskTimeoutId = -1;
		this.isHostCallbackScheduled = false;
		// this.isPerformingWork = false;
		this.scheduledHostCallback = null;
		this.performWorkStartTime = -1;
		this.currentPriority = EScheduledJobPriority.NORMAL;
	}

	scheduleJob(job: IJob, options: IScheduleOption): IScheduledTask {
		const currentTime = this.getCurrentTime();

		let startTime: number = currentTime;
		if (typeof options.delay === 'number' && options.delay > 0) {
			startTime += options.delay;
		}

		let timeout = EScheduledJobPriorityTimeout.NORMAL;

		switch (options.priorityLevel) {
			case EScheduledJobPriority.IMMEDIATE:
				timeout = EScheduledJobPriorityTimeout.IMMEDIATE;
				break;
			case EScheduledJobPriority.USER_BLOCKING:
				timeout = EScheduledJobPriorityTimeout.USER_BLOCKING;
				break;
			case EScheduledJobPriority.IDLE:
				timeout = EScheduledJobPriorityTimeout.IDLE;
				break;
			case EScheduledJobPriority.LOW:
				timeout = EScheduledJobPriorityTimeout.LOW;
				break;
			case EScheduledJobPriority.NORMAL:
			default:
				timeout = EScheduledJobPriorityTimeout.NORMAL;
				break;
		}

		const expirationTime = startTime + timeout;
		const task: IScheduledTask = {
			job,
			sortIndex: -1,
			startTime,
			expirationTime,
			priority: options.priorityLevel || EScheduledJobPriority.NORMAL,
			id: this.taskIdCounter++
		};

		if (startTime > currentTime) {
			task.sortIndex = startTime;
			this.timerHeap.push(task);
			if (this.taskHeap.peek() === null && task === this.timerHeap.peek()) {
				if (this.isHostTimeoutScheduled) {
					this.cancelHostTimeout();
				} else {
					this.isHostTimeoutScheduled = true;
				}

				this.requestHostTimeout(
					this.handleTimerTaskTimeout.bind(this),
					startTime - currentTime
				);
			}
		} else {
			task.sortIndex = task.expirationTime;
			this.taskHeap.push(task);
			if (!this.isHostCallbackScheduled) {
				this.isHostCallbackScheduled = true;
				this.requestHostCallback(this.flushWork.bind(this));
			}
		}

		return task;
	}

	cancelTask(task: IScheduledTask) {
		task.job = null;
	}

	getCurrentPriority() {
		return this.currentPriority;
	}

	getCurrentTime() {
		return performance.now();
	}

	private cancelHostTimeout() {
		clearTimeout(this.taskTimeoutId);
		this.taskTimeoutId = -1;
	}

	private requestHostCallback(
		cb: (hasTimeRemaining: boolean, currentTime: number) => any
	) {
		this.scheduledHostCallback = cb;
		setTimeout(this.performWorkUntilDeadline.bind(this), 0);
	}

	// remember that it takes some time to perform a work so here we need judge whether the latest task is expired
	private flushWork(
		hasTimeRemaining: boolean,
		initialTime: number
	): HasMoreWork {
		if (this.isHostTimeoutScheduled) {
			this.cancelHostTimeout();
			this.isHostTimeoutScheduled = false;
		}
		const previousPriority = this.currentPriority;
		try {
			return this.workLoop(hasTimeRemaining, initialTime);
		} finally {
			this.currentPriority = previousPriority;
		}
	}

	// 真正处理taskHeap的逻辑代码
	private workLoop(
		hasTimeRemaining: boolean,
		initialTime: number
	): HasMoreWork {
		let currentTime = initialTime;
		this.advanceTimers(initialTime);
		let currentTask = this.taskHeap.peek();
		while (currentTask !== null) {
			// 需要考虑任务未过期但是帧渲染已经到期了，这时候应该推出循环
			if (
				currentTask.expirationTime > initialTime &&
				(!hasTimeRemaining || this.shouldYieldForFrame())
			) {
				break;
			}
			const fn = currentTask.job;
			if (typeof fn === 'function') {
				this.currentPriority = currentTask.priority;
				currentTask.job = null;
				const didCallbackTimeout = currentTask.expirationTime <= currentTime;
				const continuationCallback = fn(didCallbackTimeout);
				currentTime = this.getCurrentTime();
				if (typeof continuationCallback === 'function') {
					currentTask.job = continuationCallback;
				} else {
					if (currentTask === this.taskHeap.peek()) {
						this.taskHeap.pop();
					}
				}
				this.advanceTimers(currentTime);
			} else {
				this.taskHeap.pop();
			}
			currentTask = this.taskHeap.peek();
		}

		if (currentTask !== null) {
			return true;
		}
		const firstTimer = this.timerHeap.peek();
		if (firstTimer !== null) {
			this.requestHostTimeout(
				this.handleTimerTaskTimeout,
				firstTimer.startTime - currentTime
			);
		}
		return false;
	}

	shouldYieldForFrame() {
		const frameInterval = 5;
		return this.getCurrentTime() - this.performWorkStartTime > frameInterval;
	}

	private performWorkUntilDeadline() {
		if (!this.scheduledHostCallback) {
			return;
		}

		const currentTime = this.getCurrentTime();

		this.performWorkStartTime = currentTime;

		let hasMoreWork = true;
		try {
			hasMoreWork = this.scheduledHostCallback(true, currentTime);
		} finally {
			if (hasMoreWork) {
				setTimeout(this.performWorkUntilDeadline.bind(this), 0);
			} else {
				this.scheduledHostCallback = null;
			}
		}
	}

	private requestHostTimeout(cb: (currentTime: number) => any, delay: number) {
		this.taskTimeoutId = setTimeout(cb, delay);
	}

	private handleTimerTaskTimeout(currentTime: number) {
		this.isHostTimeoutScheduled = false;
		this.advanceTimers(currentTime);
		if (this.isHostCallbackScheduled) {
			return;
		}

		if (this.taskHeap.peek() !== null) {
			this.isHostCallbackScheduled = true;
			this.requestHostCallback(this.flushWork);
		} else {
			const firstTimer = this.timerHeap.peek();
			if (firstTimer !== null) {
				this.requestHostTimeout(
					this.handleTimerTaskTimeout,
					firstTimer.startTime - currentTime
				);
			}
		}
	}

	private advanceTimers(currentTime: number) {
		let timer = this.timerHeap.peek();
		while (timer !== null) {
			if (timer.job === null) {
				this.timerHeap.pop();
			} else if (timer.startTime <= currentTime) {
				this.timerHeap.pop();
				timer.sortIndex = timer.expirationTime;
				this.taskHeap.push(timer);
			} else {
				return;
			}
			timer = this.timerHeap.peek();
		}
	}
}

export const scheduler = new Scheduler();
