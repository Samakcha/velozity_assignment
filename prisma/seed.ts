import { PrismaClient, UserRole, TaskStatus, TaskPriority, NotificationType } from '../server/node_modules/.prisma/client/index.js';
import bcrypt from '../server/node_modules/bcryptjs/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma database seed for Velozity Hub...\n');

  // Shared development password
  const devPasswordHash = await bcrypt.hash('Password123!', 10);

  // -------------------------------------------------------------
  // PART 2: DETERMINISTIC USERS (7 Users Total)
  // -------------------------------------------------------------
  console.log('1. Seeding deterministic user accounts...');

  const usersData = [
    { email: 'admin@velozity.test', name: 'System Admin', role: UserRole.ADMIN },
    { email: 'pm1@velozity.test', name: 'PM Alpha', role: UserRole.PROJECT_MANAGER },
    { email: 'pm2@velozity.test', name: 'PM Beta', role: UserRole.PROJECT_MANAGER },
    { email: 'dev1@velozity.test', name: 'Dev One', role: UserRole.DEVELOPER },
    { email: 'dev2@velozity.test', name: 'Dev Two', role: UserRole.DEVELOPER },
    { email: 'dev3@velozity.test', name: 'Dev Three', role: UserRole.DEVELOPER },
    { email: 'dev4@velozity.test', name: 'Dev Four', role: UserRole.DEVELOPER },
  ];

  const userMap: Record<string, string> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: devPasswordHash,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: devPasswordHash,
      },
    });
    userMap[u.email] = user.id;
  }
  console.log(`   ✓ 7 baseline users seeded (1 Admin, 2 PMs, 4 Devs).`);

  // -------------------------------------------------------------
  // PART 3: CLIENT DATA (3 Clients Minimum)
  // -------------------------------------------------------------
  console.log('2. Seeding client records...');

  const clientsData = [
    { name: 'Acme Technologies', email: 'contact@acme.test', company: 'Acme Corp' },
    { name: 'Nova Systems', email: 'info@nova.test', company: 'Nova Global' },
    { name: 'Orbit Solutions', email: 'support@orbit.test', company: 'Orbit Tech' },
  ];

  const clientMap: Record<string, string> = {};

  for (const c of clientsData) {
    let existing = await prisma.client.findFirst({
      where: { name: c.name },
    });

    if (!existing) {
      existing = await prisma.client.create({
        data: c,
      });
    }
    clientMap[c.name] = existing.id;
  }
  console.log(`   ✓ 3 client records seeded.`);

  // -------------------------------------------------------------
  // PART 4: PROJECT DATA (3 Projects Minimum)
  // -------------------------------------------------------------
  console.log('3. Seeding projects with PM ownership...');

  const projectsData = [
    {
      name: 'Acme E-Commerce Portal',
      description: 'Full-stack online shopping marketplace with payment gateway integration.',
      clientName: 'Acme Technologies',
      pmEmail: 'pm1@velozity.test',
    },
    {
      name: 'Nova Cloud Infrastructure',
      description: 'Microservices migration and automated CI/CD pipeline setup.',
      clientName: 'Nova Systems',
      pmEmail: 'pm1@velozity.test',
    },
    {
      name: 'Orbit Mobile App',
      description: 'Cross-platform iOS and Android mobile app for logistics tracking.',
      clientName: 'Orbit Solutions',
      pmEmail: 'pm2@velozity.test',
    },
  ];

  const projectMap: Record<string, string> = {};

  for (const p of projectsData) {
    const clientId = clientMap[p.clientName];
    const createdById = userMap[p.pmEmail];

    let existing = await prisma.project.findFirst({
      where: { name: p.name },
    });

    if (!existing) {
      existing = await prisma.project.create({
        data: {
          name: p.name,
          description: p.description,
          clientId,
          createdById,
        },
      });
    }
    projectMap[p.name] = existing.id;
  }
  console.log(`   ✓ 3 projects seeded (PM1 owns P1+P2; PM2 owns P3).`);

  // -------------------------------------------------------------
  // PART 5: TASK DATA (15 Tasks Minimum: 5 Per Project)
  // -------------------------------------------------------------
  console.log('4. Seeding tasks across projects & developers...');

  const now = new Date();
  const past5Days = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const past3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const future7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const future14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const tasksData = [
    // Project 1 (Acme E-Commerce Portal) -> PM1
    {
      title: 'Design Database Schema for Products',
      description: 'Create PostgreSQL tables and Prisma models for product catalog.',
      projectName: 'Acme E-Commerce Portal',
      assignedToEmail: 'dev1@velozity.test',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: past5Days,
    },
    {
      title: 'Integrate Stripe Payment Gateway',
      description: 'Implement webhooks and checkout sessions for card processing.',
      projectName: 'Acme E-Commerce Portal',
      assignedToEmail: 'dev1@velozity.test',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL,
      dueDate: future7Days,
    },
    {
      title: 'Implement Shopping Cart State',
      description: 'Build client cart state management and persistent storage.',
      projectName: 'Acme E-Commerce Portal',
      assignedToEmail: 'dev2@velozity.test',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: future14Days,
    },
    {
      title: 'Build Product Search & Filter API',
      description: 'Add server-side pagination and category filter endpoints.',
      projectName: 'Acme E-Commerce Portal',
      assignedToEmail: 'dev2@velozity.test',
      // ELIGIBLE PAST-DUE TASK 1
      status: TaskStatus.TO_DO,
      priority: TaskPriority.HIGH,
      dueDate: past5Days,
    },
    {
      title: 'Set up E-Commerce Analytics Dashboard',
      description: 'Integrate sales charts and revenue analytics.',
      projectName: 'Acme E-Commerce Portal',
      assignedToEmail: 'dev1@velozity.test',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.LOW,
      dueDate: future14Days,
    },

    // Project 2 (Nova Cloud Infrastructure) -> PM1
    {
      title: 'Configure Docker Containers for Microservices',
      description: 'Write Dockerfiles and compose configuration for services.',
      projectName: 'Nova Cloud Infrastructure',
      assignedToEmail: 'dev2@velozity.test',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: past3Days,
    },
    {
      title: 'Setup Kubernetes Deployment Manifests',
      description: 'Create ingress rules and service deployments.',
      projectName: 'Nova Cloud Infrastructure',
      assignedToEmail: 'dev2@velozity.test',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL,
      dueDate: future7Days,
    },
    {
      title: 'Automate GitHub Actions CI/CD Pipeline',
      description: 'Add lint, build, and test steps to automated workflows.',
      projectName: 'Nova Cloud Infrastructure',
      assignedToEmail: 'dev3@velozity.test',
      // ELIGIBLE PAST-DUE TASK 2
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: past3Days,
    },
    {
      title: 'Configure CloudWatch Alerts & Logging',
      description: 'Set up centralized error logging and memory threshold alarms.',
      projectName: 'Nova Cloud Infrastructure',
      assignedToEmail: 'dev3@velozity.test',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: future7Days,
    },
    {
      title: 'Perform Security Vulnerability Audit',
      description: 'Scan dependencies for vulnerabilities and patch dependencies.',
      projectName: 'Nova Cloud Infrastructure',
      assignedToEmail: 'dev2@velozity.test',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.LOW,
      dueDate: future14Days,
    },

    // Project 3 (Orbit Mobile App) -> PM2
    {
      title: 'Design Mobile UX Mockups & Wireframes',
      description: 'Create Figma design mockups for iOS and Android screens.',
      projectName: 'Orbit Mobile App',
      assignedToEmail: 'dev3@velozity.test',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: past5Days,
    },
    {
      title: 'Implement User Push Notifications',
      description: 'Integrate FCM for background push notifications.',
      projectName: 'Orbit Mobile App',
      assignedToEmail: 'dev3@velozity.test',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: future7Days,
    },
    {
      title: 'Build Live GPS Tracking Map Screen',
      description: 'Integrate Mapbox map view and websocket location updates.',
      projectName: 'Orbit Mobile App',
      assignedToEmail: 'dev4@velozity.test',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: future7Days,
    },
    {
      title: 'Optimize Mobile App Startup Time',
      description: 'Reduce bundle size and lazy load assets on app startup.',
      projectName: 'Orbit Mobile App',
      assignedToEmail: 'dev4@velozity.test',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.MEDIUM,
      dueDate: future14Days,
    },
    {
      title: 'Write End-to-End Mobile Test Suite',
      description: 'Add Appium automated end-to-end tests for login and tracking.',
      projectName: 'Orbit Mobile App',
      assignedToEmail: 'dev4@velozity.test',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.LOW,
      dueDate: future14Days,
    },
  ];

  const taskMap: Record<string, string> = {};

  for (const t of tasksData) {
    const projectId = projectMap[t.projectName];
    const assignedToId = userMap[t.assignedToEmail];

    let existing = await prisma.task.findFirst({
      where: {
        projectId,
        title: t.title,
      },
    });

    if (!existing) {
      existing = await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          projectId,
          assignedToId,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
        },
      });
    } else {
      existing = await prisma.task.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          assignedToId,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
        },
      });
    }
    taskMap[t.title] = existing.id;
  }
  console.log(`   ✓ 15 tasks seeded across projects and all 4 developers (including 2 eligible past-due tasks).`);

  // -------------------------------------------------------------
  // PART 7: HISTORICAL ACTIVITY LOGS
  // -------------------------------------------------------------
  console.log('5. Seeding historical activity logs...');

  const daysAgo10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const daysAgo7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const daysAgo3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const daysAgo1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const activitiesData = [
    {
      projectName: 'Acme E-Commerce Portal',
      taskTitle: 'Design Database Schema for Products',
      userEmail: 'dev1@velozity.test',
      action: 'STATUS_CHANGED',
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.DONE,
      createdAt: daysAgo7,
    },
    {
      projectName: 'Acme E-Commerce Portal',
      taskTitle: 'Integrate Stripe Payment Gateway',
      userEmail: 'dev1@velozity.test',
      action: 'STATUS_CHANGED',
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.IN_REVIEW,
      createdAt: daysAgo3,
    },
    {
      projectName: 'Nova Cloud Infrastructure',
      taskTitle: 'Configure Docker Containers for Microservices',
      userEmail: 'dev2@velozity.test',
      action: 'STATUS_CHANGED',
      previousStatus: TaskStatus.IN_REVIEW,
      newStatus: TaskStatus.DONE,
      createdAt: daysAgo3,
    },
    {
      projectName: 'Nova Cloud Infrastructure',
      taskTitle: 'Setup Kubernetes Deployment Manifests',
      userEmail: 'dev2@velozity.test',
      action: 'STATUS_CHANGED',
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.IN_REVIEW,
      createdAt: daysAgo1,
    },
    {
      projectName: 'Orbit Mobile App',
      taskTitle: 'Design Mobile UX Mockups & Wireframes',
      userEmail: 'dev3@velozity.test',
      action: 'STATUS_CHANGED',
      previousStatus: TaskStatus.IN_REVIEW,
      newStatus: TaskStatus.DONE,
      createdAt: daysAgo10,
    },
    {
      projectName: 'Orbit Mobile App',
      taskTitle: 'Implement User Push Notifications',
      userEmail: 'dev3@velozity.test',
      action: 'STATUS_CHANGED',
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.IN_REVIEW,
      createdAt: daysAgo1,
    },
  ];

  for (const a of activitiesData) {
    const projectId = projectMap[a.projectName];
    const taskId = taskMap[a.taskTitle];
    const userId = userMap[a.userEmail];

    const existing = await prisma.activityLog.findFirst({
      where: {
        projectId,
        taskId,
        action: a.action,
        newStatus: a.newStatus,
      },
    });

    if (!existing) {
      await prisma.activityLog.create({
        data: {
          projectId,
          taskId,
          userId,
          action: a.action,
          previousStatus: a.previousStatus,
          newStatus: a.newStatus,
          createdAt: a.createdAt,
        },
      });
    }
  }
  console.log(`   ✓ Historical activity log entries seeded with chronological timestamps.`);

  // -------------------------------------------------------------
  // PART 8: NOTIFICATION SEED DATA
  // -------------------------------------------------------------
  console.log('6. Seeding persistent notifications...');

  const notificationsData = [
    {
      userEmail: 'dev1@velozity.test',
      taskTitle: 'Integrate Stripe Payment Gateway',
      type: NotificationType.TASK_ASSIGNED,
      message: "You were assigned Task: 'Integrate Stripe Payment Gateway'",
      isRead: false,
      createdAt: daysAgo3,
    },
    {
      userEmail: 'dev3@velozity.test',
      taskTitle: 'Implement User Push Notifications',
      type: NotificationType.TASK_ASSIGNED,
      message: "You were assigned Task: 'Implement User Push Notifications'",
      isRead: false,
      createdAt: daysAgo3,
    },
    {
      userEmail: 'pm1@velozity.test',
      taskTitle: 'Integrate Stripe Payment Gateway',
      type: NotificationType.TASK_IN_REVIEW,
      message: "Task 'Integrate Stripe Payment Gateway' is now IN_REVIEW",
      isRead: false,
      createdAt: daysAgo1,
    },
    {
      userEmail: 'dev2@velozity.test',
      taskTitle: 'Implement Shopping Cart State',
      type: NotificationType.TASK_ASSIGNED,
      message: "You were assigned Task: 'Implement Shopping Cart State'",
      isRead: true,
      createdAt: daysAgo7,
    },
  ];

  for (const n of notificationsData) {
    const userId = userMap[n.userEmail];
    const taskId = taskMap[n.taskTitle];

    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        taskId,
        type: n.type,
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          taskId,
          type: n.type,
          message: n.message,
          isRead: n.isRead,
          readAt: n.isRead ? daysAgo3 : null,
          createdAt: n.createdAt,
        },
      });
    }
  }
  console.log(`   ✓ Persistent notifications seeded (read & unread user-specific notifications).`);

  console.log('\n🎉 PRISMA DATABASE SEED COMPLETED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('❌ Prisma Seed Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
