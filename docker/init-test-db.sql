-- The test database next to the dev one, both utf8mb4 (names in any script).
CREATE DATABASE IF NOT EXISTS suka_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON suka_test.* TO 'suka'@'%';
-- Prisma migrate dev creates, alters and drops a temporary shadow database.
-- Local development container only; production users get their own database.
GRANT ALL PRIVILEGES ON *.* TO 'suka'@'%';
FLUSH PRIVILEGES;
