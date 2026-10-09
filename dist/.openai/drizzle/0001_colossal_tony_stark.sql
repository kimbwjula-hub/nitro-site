PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_nitro_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`whatsapp` text,
	`service` text NOT NULL,
	`created_at` text NOT NULL,
	`consent_version` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_nitro_leads`("id", "name", "company", "whatsapp", "service", "created_at", "consent_version") SELECT "id", "name", "company", "whatsapp", "service", "created_at", "consent_version" FROM `nitro_leads`;--> statement-breakpoint
DROP TABLE `nitro_leads`;--> statement-breakpoint
ALTER TABLE `__new_nitro_leads` RENAME TO `nitro_leads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;