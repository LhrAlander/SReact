import { ReactSymbol } from './ReactSymbol';

export interface FunctionalComponent<P = any> {
	(props: P): ReactElement<P>;
}

const RESERVED_PROPS = new Set(['key']);

export class ReactElement<P = any> {
	$$typeof: ReactSymbol;
	type: string | FunctionalComponent<P>;
	props: P & { children?: ReactElement | ReactElement[] };
	key: string | null;

	constructor(
		type: string | FunctionalComponent<P>,
		key: string | null,
		props: P
	) {
		this.type = type;
		this.$$typeof = ReactSymbol.REACT_ELEMENT;
		this.props = props;
		this.key = key;
	}
}

export function createElement<P extends object = Record<string, unknown>>(
	type: string | FunctionalComponent<P>,
	config: P & { key?: string },
	...children: ReactElement[]
) {
	let key = null;
	const props: Record<string | number, unknown> = {};
	if (config) {
		if (config.key !== undefined) {
			key = `${config.key}`;
		}

		for (const name in config) {
			if (
				Object.prototype.hasOwnProperty.call(config, name) &&
				!RESERVED_PROPS.has(name)
			) {
				props[name] = config[name as keyof typeof config];
			}
		}
	}
	if (children?.length > 0) {
		props.children = children.length === 1 ? children[0] : children;
	}

	return new ReactElement(type, key, props as P);
}

export type ReactNodeList = ReactElement;
