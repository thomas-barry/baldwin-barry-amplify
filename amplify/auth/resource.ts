import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
  // Declared here, not created by hand, so Amplify gives the group its own IAM
  // role. Storage write and delete are granted to that role instead of to every
  // signed-in user. The data schema's allow.group('admin') matches this name.
  groups: ['admin'],
});
