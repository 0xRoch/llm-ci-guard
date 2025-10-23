import { logger } from "../logger";

const prisma = {
  user: {
    async findMany() {
      return [
        { id: 1, name: "Ada" },
        { id: 2, name: "Bob" },
      ];
    },
  },
};

type Request = {
  params?: Record<string, string>;
};

type Response = {
  json: (body: unknown) => void;
};

export async function listUsersController(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany();
    logger.info("Listing users from the controller");
    res.json({ users });
  } catch (error) {
    logger.error("Failed to list users", {
      error:
        error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    res.json({ error: "Unable to retrieve users at this time." });
  }
}
