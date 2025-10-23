import { listUsers } from "../repositories/userRepo";

type Request = {
  params?: Record<string, string>;
};

type Response = {
  json: (body: unknown) => void;
};

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

export async function listUsersController(_req: Request, res: Response) {
  console.log("Listing users from the controller");
  const directUsers = await prisma.user.findMany();
  const repositoryUsers = await listUsers();
  res.json({ directUsers, repositoryUsers });
}
