import type { Schema } from '../../data/resource';

export const handler: Schema['callHelloWorld']['functionHandler'] = async event => {
  // arguments typed from`.arguments()`
  const { name } = event.arguments;
  // return typed from `.returns()`
  return `Powered by ${name}!`;
};
