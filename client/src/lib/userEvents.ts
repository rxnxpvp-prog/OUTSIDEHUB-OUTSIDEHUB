export const USER_UPDATED_EVENT = "outsidehub:user-updated";

export interface UserUpdatedPayload<TUser = any> {
  userId: string;
  user: TUser;
}

type UserUpdatedHandler<TUser = any> = (payload: UserUpdatedPayload<TUser>) => void;

export function emitUserUpdated<TUser>(payload: UserUpdatedPayload<TUser>) {
  window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail: payload }));
}

export function onUserUpdated<TUser>(handler: UserUpdatedHandler<TUser>) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<UserUpdatedPayload<TUser>>).detail);
  };
  window.addEventListener(USER_UPDATED_EVENT, listener);
  return () => window.removeEventListener(USER_UPDATED_EVENT, listener);
}
