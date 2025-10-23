import { logger } from "../logger";
import { listUsers } from "../repositories/userRepo";

type Request = {
  params?: Record<string, string>;
};

type Response = {
  json: (body: unknown) => void;
};

export async function listUsersController(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    logger.info("Listing users from the controller");
    console.log("Users fetched", users);
    res.json({ users });
  } catch (error) {
    logger.error("Failed to list users", {
      error:
        error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    res.json({ error: "Unable to retrieve users at this time." });
  }
}
