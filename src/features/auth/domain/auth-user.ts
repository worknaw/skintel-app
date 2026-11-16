export type AuthUser = Readonly<{
  id: string;
  email: string | null;
}>;

export type AuthDestination = Readonly<{
  pathname: string;
  params?: Readonly<Record<string, string>>;
}>;

