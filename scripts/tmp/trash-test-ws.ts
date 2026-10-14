// Temporary: moves a test workspace to the trash (restorable for 30 days).
import { prisma } from '../../src/lib/db';
import { deleteSlideshowWorkspace } from '../../src/server/autoSlideshow/workspaceTrash';
const main = async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: 'giompanot@gmail.com' } });
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: process.argv[2]! } });
  console.log(`trashing ${ws.id} ${ws.websiteUrl}`);
  await deleteSlideshowWorkspace(user.id, ws.id);
  await prisma.$disconnect();
};
void main();
