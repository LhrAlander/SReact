import reconcile from 'react-reconciler';
export function createElement() {
  console.log('React.createElement', arguments);
}

export function Fragment() {
  console.log('React.Fragment', arguments);
}

export default function a () {
  reconcile()
}
