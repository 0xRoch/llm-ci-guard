Rule 1 — No direct database queries in controllers.
Look for code that calls ORM methods like db.user.findMany() or prisma.* inside controllers/.
These should be done in repository modules instead.
