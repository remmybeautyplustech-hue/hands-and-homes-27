CREATE TABLE `submissions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `type` text NOT NULL,
  `name` text NOT NULL,
  `email` text,
  `phone` text,
  `payload` text NOT NULL,
  `status` text NOT NULL DEFAULT 'new',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
