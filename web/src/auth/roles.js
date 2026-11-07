const HOME_PATHS = {
  admin: '/coordinator',
  coordinator: '/coordinator',
  technician: '/technician',
  cec: '/cec',
  client: '/client',
};

export function homePathFor(role) {
  return HOME_PATHS[role] ?? '/login';
}
