import { getUsers } from "./user.repository.js";

export async function listUsers() {
  return await getUsers();
}
