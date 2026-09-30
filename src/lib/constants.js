// Admin accounts live in the Firestore `admins` collection — seed one with
// `npm run seed:admin`. No credentials are hardcoded in the client.
// Categories are created by the admin at runtime; nothing is seeded.

export const COL = {
  admins: 'admins',
  categories: 'categories',
  problems: 'problems',
  teams: 'teams',
}
