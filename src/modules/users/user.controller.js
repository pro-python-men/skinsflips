import { listUsers } from "./user.service.js";

export async function getUsers(req, res) {
  try {
    const users = await listUsers();
    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        createdAt: u.created_at
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
}
