import { defineFunction } from '@aws-amplify/backend';

const readUploadLogs = defineFunction({
  name: 'readUploadLogs',
  entry: 'handler.ts',
  // Amplify puts every function in one shared `function` nested stack by
  // default. This one backs a data resolver, so leaving it there makes the data
  // stack depend on the function stack, while onUploadHandler already makes the
  // function stack depend on data — a cycle CloudFormation rejects. Placing it
  // in the data stack removes that edge.
  resourceGroupName: 'data',
  // CloudWatch paginates slowly over a wide time range; 3s is not enough.
  timeoutSeconds: 30,
});

export { readUploadLogs };
