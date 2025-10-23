import { logger } from "../logger";
import { listUsers } from "../repositories/userRepo";

type Request = {
  params?: Record<string, string>;
};

type Response = {
  json: (body: unknown) => void;
};

export async function listUsersController(_req: Request, res: Response) {
  const users = await listUsers();
  logger.info("Listing users from the controller");
  res.json({ users });
}
