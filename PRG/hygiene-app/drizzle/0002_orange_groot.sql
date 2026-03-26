ALTER TABLE `checklist_completions` MODIFY COLUMN `completedItems` text NOT NULL;--> statement-breakpoint
ALTER TABLE `training_records` MODIFY COLUMN `participantIds` text NOT NULL;