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
  // The only accounts are admins, and an admin session can write and delete
  // every gallery, image and post, so a password alone is not enough. TOTP
  // only: SMS would need an SNS sending setup and is weaker. Existing users are
  // asked to enroll an authenticator app at their next sign-in, which the
  // <Authenticator> in LoginDialog handles. For a lost device, clearing the
  // user's TOTP preference does NOT reset the factor (tried in the sandbox:
  // sign-in still asked for the old code). Recovery is recreating the admin
  // user from an IAM session (admin-delete-user, admin-create-user,
  // admin-add-user-to-group admin); the new user sets a password and enrolls
  // at first sign-in. Rehearsed in the sandbox. Access is by group, not user
  // id, so nothing is lost. The invitation comes from
  // no-reply@verificationemail.com and may land in spam.
  multifactor: {
    mode: 'REQUIRED',
    totp: true,
  },
});
