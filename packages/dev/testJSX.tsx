import * as React from 'react';

function handleClick(e: any) {
	console.log('handle click', e);
}

export const a = (
	<div onClick={handleClick} className="hello-div">
		<span>Hello</span>
		<b>World!</b>
		<br />
	</div>
);
