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

export async function listUsers() {
  return prisma.user.findMany();
}
